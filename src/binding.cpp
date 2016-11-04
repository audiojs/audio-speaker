#include "pointer_wrapper.h"
#include "out123.h"

using namespace node;
using namespace v8;

namespace {

    struct write_req {
        uv_work_t req;
        out123_handle *ao;
        unsigned char *buffer;
        int len;
        int written;
        Nan::Callback *callback;
    };

    void result_callback(Nan::Callback *cb, int result);

    void write_async(uv_work_t *);
    void write_after(uv_work_t *);

    NAN_METHOD(create) {
        Nan::EscapableHandleScope scope;

        int value = 0;

        out123_handle *ao = out123_new();

        if(!ao) {
            fprintf(stderr, "Failed to initialize output handle.\n");
            out123_del(ao);
            value = 0;
        } else if(out123_open(ao, NULL, NULL) != OUT123_OK) {
            fprintf(stderr, "Failed to open output: %s\n", out123_strerror(ao));
            out123_del(ao);
            value = 0;
        } else {
          value = 1;
        }

        result_callback(new Nan::Callback(info[0].As<Function>()), value);

        info.GetReturnValue().Set(scope.Escape(WrapPointer(ao, static_cast<uint32_t>(sizeof(ao)))));
    }

    NAN_METHOD(open) {
        Nan::HandleScope scope;

        out123_handle *ao = UnwrapPointer<out123_handle *>(info[0]);

        long rate = (long) info[1]->Int32Value();
        int channels = info[2]->Int32Value();
        int encoding = info[3]->Int32Value();

        int value = 0;

        const char *encname;
        encname = out123_enc_name(encoding);

        printf("Playing with %i channel(s), %li Hz(s) and encoding %s.\n", channels, rate, encname ? encname : "???");

        if(out123_start(ao, rate, channels, encoding) || !ao) {
            fprintf(stderr, "Failed to start output: %s\n", out123_strerror(ao));
            out123_del(ao);
            value = 0;
        } else {
            value = 1;
        }

        result_callback(new Nan::Callback(info[4].As<Function>()), value);

        info.GetReturnValue().SetUndefined();
    }

    NAN_METHOD(write) {
        Nan::HandleScope scope;

        out123_handle *ao = UnwrapPointer<out123_handle *>(info[0]);
        unsigned char *buffer = UnwrapPointer<unsigned char *>(info[1]);
        int length = info[2]->Int32Value();

        write_req *req = new write_req;
        req->ao = ao;
        req->buffer = buffer;
        req->len = length;
        req->written = 0;
        req->callback = new Nan::Callback(info[3].As<Function>());

        req->req.data = req;

        uv_queue_work(uv_default_loop(), &req->req, write_async, (uv_after_work_cb) write_after);

        info.GetReturnValue().SetUndefined();
    }

    NAN_METHOD(flush) {
        Nan::HandleScope scope;

        out123_handle *ao = UnwrapPointer<out123_handle *>(info[0]);

        int value = 0;

        if(ao) {
            out123_drain(ao);
            value = 1;
        } else {
            value = 0;
        }

        result_callback(new Nan::Callback(info[1].As<Function>()), value);

        info.GetReturnValue().SetUndefined();
    }

    NAN_METHOD(close) {
        Nan::HandleScope scope;

        out123_handle *ao = UnwrapPointer<out123_handle *>(info[0]);

        int value = 0;

        if(ao) {
            out123_drop(ao);
            out123_del(ao);
            value = 1;
        } else {
            value = 0;
        }

        result_callback(new Nan::Callback(info[1].As<Function>()), value);

        info.GetReturnValue().SetUndefined();
    }

    void result_callback(Nan::Callback *callback, int result) {
        Nan::HandleScope scope;

        Local<Value> argv[] = {
            Nan::New(static_cast<uint32_t>(result))
        };

        callback->Call(1, argv);
    }

    void write_async(uv_work_t *req) {
        write_req *wreq = reinterpret_cast<write_req *>(req->data);
        wreq->written = out123_play(wreq->ao, wreq->buffer, wreq->len);
    }

    void write_after(uv_work_t *req) {
        Nan::HandleScope scope;

        write_req *wreq = reinterpret_cast<write_req *>(req->data);

        Local<Value> argv[] = {
            Nan::New(wreq->written)
        };

        wreq->callback->Call(1, argv);

        delete wreq->callback;
    }

    void InitializeModule(Handle<Object> target) {
        Nan::HandleScope scope;

        out123_handle *ao = out123_new();

        long rate = 44100;
        int channels = 2;
        int encoding = MPG123_ENC_SIGNED_16;
        int framesize = 1;

        if(!ao) {
            fprintf(stderr, "Failed to initialize output handle.\n");
            out123_del(ao);
        } else if(out123_open(ao, NULL, NULL) != OUT123_OK) {
            fprintf(stderr, "Failed to open output: %s\n", out123_strerror(ao));
            out123_del(ao);
        }

        #define CONST_INT(value) \
            Nan::ForceSet(target, Nan::New(#value).ToLocalChecked(), Nan::New(value), \
                static_cast<PropertyAttribute>(ReadOnly|DontDelete));

            CONST_INT(MPG123_ENC_FLOAT_32);
            CONST_INT(MPG123_ENC_FLOAT_64);
            CONST_INT(MPG123_ENC_SIGNED_8);
            CONST_INT(MPG123_ENC_UNSIGNED_8);
            CONST_INT(MPG123_ENC_SIGNED_16);
            CONST_INT(MPG123_ENC_UNSIGNED_16);
            CONST_INT(MPG123_ENC_SIGNED_24);
            CONST_INT(MPG123_ENC_UNSIGNED_24);
            CONST_INT(MPG123_ENC_SIGNED_32);
            CONST_INT(MPG123_ENC_UNSIGNED_32);

        Nan::SetMethod(target, "create", create);
        Nan::SetMethod(target, "open", open);
        Nan::SetMethod(target, "write", write);
        Nan::SetMethod(target, "flush", flush);
        Nan::SetMethod(target, "close", close);
    }
}

NODE_MODULE(binding, InitializeModule);
