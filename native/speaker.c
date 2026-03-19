/*
 * audio-speaker native addon
 * Minimal miniaudio N-API binding: ring buffer bridging push writes ↔ pull callback
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
  ma_uint32 channels;
  ma_uint32 sample_rate;
  ma_format format;
  int started;
  int closed;
} speaker_t;

/* Miniaudio playback callback — pulls from ring buffer */
static void playback_callback(ma_device* device, void* output, const void* input, ma_uint32 frame_count) {
  speaker_t* sp = (speaker_t*)device->pUserData;
  ma_uint32 bytes_per_frame = ma_get_bytes_per_frame(sp->format, sp->channels);

  void* read_buf;
  ma_uint32 frames_read = frame_count;
  ma_result result = ma_pcm_rb_acquire_read(&sp->ring_buffer, &frames_read, &read_buf);

  if (result == MA_SUCCESS && frames_read > 0) {
    memcpy(output, read_buf, frames_read * bytes_per_frame);
    ma_pcm_rb_commit_read(&sp->ring_buffer, frames_read);

    /* silence remaining if ring buffer didn't have enough */
    if (frames_read < frame_count) {
      memset((ma_uint8*)output + frames_read * bytes_per_frame, 0,
             (frame_count - frames_read) * bytes_per_frame);
    }
  } else {
    /* ring buffer empty — output silence */
    memset(output, 0, frame_count * bytes_per_frame);
  }

  (void)input;
}

/* Shared cleanup — called from close() or GC finalizer */
static void speaker_destroy(speaker_t* sp) {
  if (!sp) return;
  if (!sp->closed) {
    sp->closed = 1;
    if (sp->started) {
      ma_device_stop(&sp->device);
      sp->started = 0;
    }
    ma_device_uninit(&sp->device);
    ma_pcm_rb_uninit(&sp->ring_buffer);
  }
  free(sp);
}

/* GC destructor — safety net if close() was never called */
static void speaker_destructor(napi_env env, void* data, void* hint) {
  speaker_destroy((speaker_t*)data);
  (void)env;
  (void)hint;
}

/* speaker_open(sampleRate, channels, bitDepth, bufferMs) → external handle */
static napi_value speaker_open(napi_env env, napi_callback_info info) {
  size_t argc = 4;
  napi_value argv[4];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  if (argc < 3) {
    napi_throw_error(env, NULL, "speaker_open requires (sampleRate, channels, bitDepth[, bufferMs])");
    return NULL;
  }

  ma_uint32 sample_rate, channels, bit_depth, buffer_ms;
  NAPI_CALL(env, napi_get_value_uint32(env, argv[0], &sample_rate));
  NAPI_CALL(env, napi_get_value_uint32(env, argv[1], &channels));
  NAPI_CALL(env, napi_get_value_uint32(env, argv[2], &bit_depth));

  buffer_ms = 50; /* default 50ms ring buffer */
  if (argc > 3) {
    NAPI_CALL(env, napi_get_value_uint32(env, argv[3], &buffer_ms));
  }
  if (buffer_ms < 10) buffer_ms = 10;
  if (buffer_ms > 2000) buffer_ms = 2000;

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

  /* ring buffer sized for requested latency */
  ma_uint32 rb_frames = (sample_rate * buffer_ms) / 1000;
  /* round up to power of 2 for miniaudio ring buffer */
  ma_uint32 rb_pow2 = 1;
  while (rb_pow2 < rb_frames) rb_pow2 <<= 1;

  ma_result result = ma_pcm_rb_init(format, channels, rb_pow2, NULL, NULL, &sp->ring_buffer);
  if (result != MA_SUCCESS) {
    free(sp);
    napi_throw_error(env, NULL, "Failed to init ring buffer");
    return NULL;
  }

  /* configure device */
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
    free(sp);
    napi_throw_error(env, NULL, "Failed to init audio device");
    return NULL;
  }

  result = ma_device_start(&sp->device);
  if (result != MA_SUCCESS) {
    ma_device_uninit(&sp->device);
    ma_pcm_rb_uninit(&sp->ring_buffer);
    free(sp);
    napi_throw_error(env, NULL, "Failed to start audio device");
    return NULL;
  }

  sp->started = 1;

  napi_value external;
  NAPI_CALL(env, napi_create_external(env, sp, speaker_destructor, NULL, &external));
  return external;
}

/* speaker_write(handle, buffer) → number of frames written */
static napi_value speaker_write(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value argv[2];
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

  ma_uint32 bytes_per_frame = ma_get_bytes_per_frame(sp->format, sp->channels);
  if (bytes_per_frame == 0) {
    napi_value result;
    NAPI_CALL(env, napi_create_uint32(env, 0, &result));
    return result;
  }

  ma_uint32 total_frames = (ma_uint32)(byte_length / bytes_per_frame);
  ma_uint32 frames_written = 0;

  while (frames_written < total_frames) {
    ma_uint32 frames_to_write = total_frames - frames_written;
    void* write_buf;

    ma_result res = ma_pcm_rb_acquire_write(&sp->ring_buffer, &frames_to_write, &write_buf);
    if (res != MA_SUCCESS || frames_to_write == 0) break;

    memcpy(write_buf, (ma_uint8*)data + frames_written * bytes_per_frame,
           frames_to_write * bytes_per_frame);
    ma_pcm_rb_commit_write(&sp->ring_buffer, frames_to_write);
    frames_written += frames_to_write;
  }

  napi_value result;
  NAPI_CALL(env, napi_create_uint32(env, frames_written, &result));
  return result;
}

/* speaker_available(handle) → frames available in ring buffer for writing */
static napi_value speaker_available(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  speaker_t* sp;
  NAPI_CALL(env, napi_get_value_external(env, argv[0], (void**)&sp));

  ma_uint32 available = ma_pcm_rb_available_write(&sp->ring_buffer);

  napi_value result;
  NAPI_CALL(env, napi_create_uint32(env, available, &result));
  return result;
}

/* speaker_flush(handle) → boolean (true if buffer is drained) */
static napi_value speaker_flush(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value argv[1];
  NAPI_CALL(env, napi_get_cb_info(env, info, &argc, argv, NULL, NULL));

  speaker_t* sp;
  NAPI_CALL(env, napi_get_value_external(env, argv[0], (void**)&sp));

  ma_uint32 available_read = ma_pcm_rb_available_read(&sp->ring_buffer);
  int flushed = (available_read == 0);

  napi_value result;
  NAPI_CALL(env, napi_get_boolean(env, flushed, &result));
  return result;
}

/* speaker_close(handle) — stops device, frees resources. free(sp) deferred to GC finalizer. */
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
  }

  return NULL;
}

/* Module init */
static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor props[] = {
    { "open",      NULL, speaker_open,      NULL, NULL, NULL, napi_default, NULL },
    { "write",     NULL, speaker_write,     NULL, NULL, NULL, napi_default, NULL },
    { "available", NULL, speaker_available, NULL, NULL, NULL, napi_default, NULL },
    { "flush",     NULL, speaker_flush,     NULL, NULL, NULL, napi_default, NULL },
    { "close",     NULL, speaker_close,     NULL, NULL, NULL, napi_default, NULL },
  };
  NAPI_CALL(env, napi_define_properties(env, exports, 5, props));
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
