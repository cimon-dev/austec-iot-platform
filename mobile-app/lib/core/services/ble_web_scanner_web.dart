import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';

@JS('austecWebBle')
external AustecWebBle? get austecWebBle;

@JS()
extension type AustecWebBle(JSObject _) implements JSObject {
  external bool isSupported();
  external JSPromise<JSString> requestDevice();
  external JSPromise<JSString> sendBleOnboardPayload(JSString payload);
}

bool isWebBluetoothSupported() {
  try {
    final bleObj = austecWebBle;
    if (bleObj != null) {
      return bleObj.isSupported();
    }
  } catch (_) {}
  return false;
}

Future<Map<String, dynamic>?> scanWebBluetooth() async {
  try {
    final bleObj = austecWebBle;
    if (bleObj != null) {
      final jsString = await bleObj.requestDevice().toDart;
      final parsed = jsonDecode(jsString.toDart) as Map<String, dynamic>;
      return parsed;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

Future<Map<String, dynamic>?> sendWebBluetoothOnboard(String payload) async {
  try {
    final bleObj = austecWebBle;
    if (bleObj != null) {
      final jsString = await bleObj.sendBleOnboardPayload(payload.toJS).toDart;
      final parsed = jsonDecode(jsString.toDart) as Map<String, dynamic>;
      return parsed;
    }
  } catch (e) {
    return {'success': false, 'error': e.toString()};
  }
  return {'success': false, 'error': 'Web Bluetooth không khả dụng'};
}
