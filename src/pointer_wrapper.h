#include <nan.h>

inline static void wrap_pointer_cb(char *data, void *hint) {
    fprintf(stderr, "Wrapped pointer was garbage collected. \n");
}

inline static v8::Local<v8::Value> WrapPointer(void *ptr, size_t length) {
    void *user_data = NULL;
    return Nan::NewBuffer((char *)ptr, length, wrap_pointer_cb, user_data).ToLocalChecked();
}

inline static v8::Local<v8::Value> WrapPointer(void *ptr) {
    return WrapPointer((char *)ptr, 0);
}

inline static char * UnwrapPointer(v8::Local<v8::Value> buffer, int64_t offset = 0) {
    if(node::Buffer::HasInstance(buffer)) {
        return node::Buffer::Data(buffer.As<v8::Object>()) + offset;
    } else {
        return NULL;
    }
}

template <typename Type>
inline static Type UnwrapPointer(v8::Local<v8::Value> buffer) {
  return reinterpret_cast<Type>(UnwrapPointer(buffer));
}
