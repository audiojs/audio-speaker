/*
 * audio-speaker native addon
 * Minimal miniaudio N-API binding: ring buffer bridging push writes ↔ pull callback
 *
 * Features:
 * - Async write (worker thread, no JS event loop in critical path)
 * - Optional capture ring buffer for output verification
 */

#define MA_NO_DECODING
#define MA_NO_ENCODING
#define MA_NO_RESOURCE_MANAGER
#define MA_NO_NODE_GRAPH
#define MA_NO_ENGINE
#define MA_NO_GENERATION
#define MINIAUDIO_IMPLEMENTATION
#include "miniaudio.h"

#include <node_api.h>
#include <string.h>

#define NAPI_CALL(env, call)                                          \
  do {                                                                \
    napi_status status = (call);                                      \
    if (status != napi_ok) {                                          \
      const napi_extended_error_info* error_info = NULL;              \
      napi_get_last_error_info((env), &error_info);                   \
      const char* msg = (error_info && error_info->error_message)     \
        ? error_info->error_message : "Unknown N-API error";          \
      napi_throw_error((env), NULL, msg);                             \
      return NULL;                                                    \
    }                                                                 \
  } while (0)

/* Speaker instance */
typedef struct {
  ma_device device;
  ma_pcm_rb ring_buffer;
  ma_pcm_rb capture_rb;      /* capture ring buffer (opt-in) */
  ma_uint32 channels;
  ma_uint32 sample_rate;
  ma_format format;
  ma_uint32 start_threshold; /* frames buffered before device starts */
  int started;
  int closed;
  int capture;               /* 1 if capture enabled */
} speaker_t;

/* Async write work */
typedef struct {
  speaker_t* sp;
  void* data;
  size_t byte_length;
  ma_uint32 frames_written;
  napi_async_work work;
  napi_ref callback_ref;
  napi_ref buffer_ref;       /* prevent GC of buffer during async write */
} write_work_t;

/* Miniaudio playback callback — pulls from ring buffer, captures output */
static void playback_callback(ma_device* device, void* output, const void* input, ma_uint32 frame_count) {
  speaker_t* sp = (speaker_t*)device->pUserData;
  ma_uint32 bpf = ma_get_bytes_per_frame(sp->format, sp->channels);

  /* read in a loop to handle ring buffer wraparound */
  ma_uint32 total_read = 0;
  while (total_read < frame_count) {
    ma_uint32 to_read = frame_count - total_read;
    void* read_buf;
    ma_result result = ma_pcm_rb_acquire_read(&sp->ring_buffer, &to_read, &read_buf);
    if (result != MA_SUCCESS || to_read == 0) break;
    memcpy((ma_uint8*)output + total_read * bpf, read_buf, to_read * bpf);
    ma_pcm_rb_commit_read(&sp->ring_buffer, to_read);
    total_read += to_read;
  }
  /* silence any remaining */
  if (total_read < frame_count) {
    memset((ma_uint8*)output + total_read * bpf, 0, (frame_count - total_read) * bpf);
  }

  /* capture in a loop to handle wraparound */
  if (sp->capture) {
    ma_uint32 total_cap = 0;
    while (total_cap < frame_count) {
      ma_uint32 to_cap = frame_count - total_cap;
      void* cap_buf;
      if (ma_pcm_rb_acquire_write(&sp->capture_rb, &to_cap, &cap_buf) != MA_SUCCESS || to_cap == 0) break;
      memcpy(cap_buf, (ma_uint8*)output + total_cap * bpf, to_cap * bpf);
      ma_pcm_rb_commit_write(&sp->capture_rb, to_cap);
      total_cap += to_cap;
    }
  }

  (void)input;
}

/* GC destructor */
static void speaker_destructor(napi_env env, void* data, void* hint) {
  speaker_t* sp = (speaker_t*)data;
  if (!sp) return;
  if (!sp->closed) {
    sp->closed = 1;
    if (sp->started) {
      ma_device_stop(&sp->device);
      sp->started = 0;
    }
    ma_device_uninit(&sp->device);
    ma_pcm_rb_uninit(&sp->ring_buffer);
    if (sp->capture) ma_pcm_rb_uninit(&sp->capture_rb);
  }
  free(sp);
  (void)env;
  (void)hint;
}

/* speaker_open(sampleRate, channels, bitDepth, bufferMs, capture) → external */
static napi_value speaker_open(napi_env env, napi_callback_info info) {
  size_t argc = 5;
  napi_value argv[5];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  if (argc < 3) {
    napi_throw_error(env, NULL, "speaker_open requires (sampleRate, channels, bitDepth[, bufferMs, capture])");
    return NULL;
  }

  ma_uint32 sample_rate, channels, bit_depth, buffer_ms;
  NAPI_CALL(env, napi_get_value_uint32(env, argv[0], &sample_rate));
  NAPI_CALL(env, napi_get_value_uint32(env, argv[1], &channels));
  NAPI_CALL(env, napi_get_value_uint32(env, argv[2], &bit_depth));

  buffer_ms = 100;
  if (argc > 3) NAPI_CALL(env, napi_get_value_uint32(env, argv[3], &buffer_ms));
  if (buffer_ms < 10) buffer_ms = 10;
  if (buffer_ms > 2000) buffer_ms = 2000;

  int capture = 0;
  if (argc > 4) {
    bool val;
    NAPI_CALL(env, napi_get_value_bool(env, argv[4], &val));
    capture = val ? 1 : 0;
  }

  ma_format format;
  switch (bit_depth) {
    case 8:  format = ma_format_u8;  break;
    case 16: format = ma_format_s16; break;
    case 24: format = ma_format_s24; break;
    case 32: format = ma_format_f32; break;
    default:
      napi_throw_error(env, NULL, "Unsupported bitDepth (use 8, 16, 24, 32)");
      return NULL;
  }

  speaker_t* sp = (speaker_t*)calloc(1, sizeof(speaker_t));
  if (!sp) {
    napi_throw_error(env, NULL, "Failed to allocate speaker");
    return NULL;
  }

  sp->channels = channels;
  sp->sample_rate = sample_rate;
  sp->format = format;
  sp->capture = capture;

  /* ring buffer: round up to power of 2 */
  ma_uint32 rb_frames = (sample_rate * buffer_ms) / 1000;
  ma_uint32 rb_pow2 = 1;
  while (rb_pow2 < rb_frames) rb_pow2 <<= 1;

  sp->start_threshold = rb_pow2 / 2; /* start playback when half-full */

  ma_result result = ma_pcm_rb_init(format, channels, rb_pow2, NULL, NULL, &sp->ring_buffer);
  if (result != MA_SUCCESS) {
    free(sp);
    napi_throw_error(env, NULL, "Failed to init ring buffer");
    return NULL;
  }

  /* capture ring buffer — 5s to hold enough for verification */
  if (capture) {
    ma_uint32 cap_frames = sample_rate * 5;
    ma_uint32 cap_pow2 = 1;
    while (cap_pow2 < cap_frames) cap_pow2 <<= 1;
    result = ma_pcm_rb_init(format, channels, cap_pow2, NULL, NULL, &sp->capture_rb);
    if (result != MA_SUCCESS) {
      ma_pcm_rb_uninit(&sp->ring_buffer);
      free(sp);
      napi_throw_error(env, NULL, "Failed to init capture ring buffer");
      return NULL;
    }
  }

  ma_device_config config = ma_device_config_init(ma_device_type_playback);
  config.playback.format = format;
  config.playback.channels = channels;
  config.sampleRate = sample_rate;
  config.dataCallback = playback_callback;
  config.pUserData = sp;
  config.performanceProfile = ma_performance_profile_low_latency;

  result = ma_device_init(NULL, &config, &sp->device);
  if (result != MA_SUCCESS) {
    ma_pcm_rb_uninit(&sp->ring_buffer);
    if (capture) ma_pcm_rb_uninit(&sp->capture_rb);
    free(sp);
    napi_throw_error(env, NULL, "Failed to init audio device");
    return NULL;
  }

  /* device starts later — when ring buffer reaches threshold (write_execute) */
  sp->started = 0;

  napi_value external;
  NAPI_CALL(env, napi_create_external(env, sp, speaker_destructor, NULL, &external));
  return external;
}

/* --- Async write --- */

static void write_execute(napi_env env, void* data) {
  write_work_t* w = (write_work_t*)data;
  speaker_t* sp = w->sp;
  ma_uint32 bpf = ma_get_bytes_per_frame(sp->format, sp->channels);
  if (bpf == 0) { w->frames_written = 0; return; }

  ma_uint32 total = (ma_uint32)(w->byte_length / bpf);
  ma_uint32 written = 0;

  while (written < total && !sp->closed) {
    ma_uint32 to_write = total - written;
    void* write_buf;
    ma_result res = ma_pcm_rb_acquire_write(&sp->ring_buffer, &to_write, &write_buf);
    if (res == MA_SUCCESS && to_write > 0) {
      memcpy(write_buf, (ma_uint8*)w->data + written * bpf, to_write * bpf);
      ma_pcm_rb_commit_write(&sp->ring_buffer, to_write);
      written += to_write;

      /* start device once ring buffer reaches threshold */
      if (!sp->started && ma_pcm_rb_available_read(&sp->ring_buffer) >= sp->start_threshold) {
        if (ma_device_start(&sp->device) == MA_SUCCESS) {
          sp->started = 1;
        }
      }
    } else {
      ma_sleep(1);
    }
  }

  /* if we wrote everything but device hasn't started (short audio), start now */
  if (!sp->started && written > 0 && !sp->closed) {
    if (ma_device_start(&sp->device) == MA_SUCCESS) {
      sp->started = 1;
    }
  }

  w->frames_written = written;
}

static void write_complete(napi_env env, napi_status status, void* data) {
  write_work_t* w = (write_work_t*)data;

  napi_value callback, global, argv[2];
  napi_get_reference_value(env, w->callback_ref, &callback);
  napi_get_global(env, &global);

  /* cb(null, framesWritten) */
  napi_get_null(env, &argv[0]);
  napi_create_uint32(env, w->frames_written, &argv[1]);
  napi_call_function(env, global, callback, 2, argv, NULL);

  napi_delete_reference(env, w->callback_ref);
  napi_delete_reference(env, w->buffer_ref);
  napi_delete_async_work(env, w->work);
  free(w);
}

/* speaker_write(handle, buffer, callback) — async, calls cb(null, framesWritten) */
static napi_value speaker_write(napi_env env, napi_callback_info info) {
  size_t argc = 3;
  napi_value argv[3];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  speaker_t* sp;
  NAPI_CALL(env, napi_get_value_external(env, argv[0], (void**)&sp));

  if (sp->closed) {
    napi_throw_error(env, NULL, "Speaker is closed");
    return NULL;
  }

  void* data;
  size_t byte_length;
  NAPI_CALL(env, napi_get_buffer_info(env, argv[1], &data, &byte_length));

  write_work_t* w = (write_work_t*)calloc(1, sizeof(write_work_t));
  w->sp = sp;
  w->data = data;
  w->byte_length = byte_length;

  NAPI_CALL(env, napi_create_reference(env, argv[2], 1, &w->callback_ref));
  NAPI_CALL(env, napi_create_reference(env, argv[1], 1, &w->buffer_ref));

  napi_value work_name;
  NAPI_CALL(env, napi_create_string_utf8(env, "speaker_write", NAPI_AUTO_LENGTH, &work_name));
  NAPI_CALL(env, napi_create_async_work(env, NULL, work_name, write_execute, write_complete, w, &w->work));
  NAPI_CALL(env, napi_queue_async_work(env, w->work));

  return NULL;
}

/* speaker_read(handle, buffer) → frames read from capture buffer */
static napi_value speaker_read(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  speaker_t* sp;
  NAPI_CALL(env, napi_get_value_external(env, argv[0], (void**)&sp));

  if (!sp->capture) {
    napi_throw_error(env, NULL, "Capture not enabled");
    return NULL;
  }

  void* data;
  size_t byte_length;
  NAPI_CALL(env, napi_get_buffer_info(env, argv[1], &data, &byte_length));

  ma_uint32 bpf = ma_get_bytes_per_frame(sp->format, sp->channels);
  ma_uint32 max_frames = (ma_uint32)(byte_length / bpf);
  ma_uint32 frames_read = 0;

  while (frames_read < max_frames) {
    ma_uint32 to_read = max_frames - frames_read;
    void* read_buf;
    ma_result res = ma_pcm_rb_acquire_read(&sp->capture_rb, &to_read, &read_buf);
    if (res != MA_SUCCESS || to_read == 0) break;
    memcpy((ma_uint8*)data + frames_read * bpf, read_buf, to_read * bpf);
    ma_pcm_rb_commit_read(&sp->capture_rb, to_read);
    frames_read += to_read;
  }

  napi_value result;
  NAPI_CALL(env, napi_create_uint32(env, frames_read, &result));
  return result;
}

/* speaker_flush(handle) → boolean */
static napi_value speaker_flush(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  speaker_t* sp;
  NAPI_CALL(env, napi_get_value_external(env, argv[0], (void**)&sp));

  /* start device if not started yet (short audio + flush) */
  if (!sp->started && ma_pcm_rb_available_read(&sp->ring_buffer) > 0) {
    if (ma_device_start(&sp->device) == MA_SUCCESS) {
      sp->started = 1;
    }
  }

  int flushed = (ma_pcm_rb_available_read(&sp->ring_buffer) == 0);
  napi_value result;
  NAPI_CALL(env, napi_get_boolean(env, flushed, &result));
  return result;
}

/* speaker_close(handle) */
static napi_value speaker_close(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  speaker_t* sp;
  NAPI_CALL(env, napi_get_value_external(env, argv[0], (void**)&sp));

  if (!sp->closed) {
    sp->closed = 1;
    if (sp->started) {
      ma_device_stop(&sp->device);
      sp->started = 0;
    }
    ma_device_uninit(&sp->device);
    ma_pcm_rb_uninit(&sp->ring_buffer);
    if (sp->capture) ma_pcm_rb_uninit(&sp->capture_rb);
  }

  return NULL;
}

/* Module init */
static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor props[] = {
    { "open",  NULL, speaker_open,  NULL, NULL, NULL, napi_default, NULL },
    { "write", NULL, speaker_write, NULL, NULL, NULL, napi_default, NULL },
    { "read",  NULL, speaker_read,  NULL, NULL, NULL, napi_default, NULL },
    { "flush", NULL, speaker_flush, NULL, NULL, NULL, napi_default, NULL },
    { "close", NULL, speaker_close, NULL, NULL, NULL, napi_default, NULL },
  };
  NAPI_CALL(env, napi_define_properties(env, exports, 5, props));
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
