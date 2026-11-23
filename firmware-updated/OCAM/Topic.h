class Topic{

private:
  struct PUB{
    String isOnline;
    String action;
    String mocua;
    String getDatas;
    String TOPIC;
  };

  struct SUB{
    String isOnline;
    String action;
    String mocua;
    String getDatas;
  };
//  String _uid;
//  String _device_id;   
//  String topic(String a, String b){
//    String c = a;
//    c = a + "/";
//    c = c + b;
//    return c;
//  }
  
  String topic(String a, String b, String c){
    String d = a;
    d = a + "/";
    d = d + b;
    d = d + "/";
    d = d + c;
    return d;
  }
  String ONLINE = "isonline";
  String ACTION= "action";
  String MOCUA= "mocua";
  String GETDATA= "getdata";

public:
  String TOPIC;
  PUB pub;
  SUB sub;
  void begin (String _uid, String _device_id){
    pub.isOnline = topic(_uid, _device_id, "pub/" + ONLINE);
    pub.action = topic(_uid, _device_id, "pub/" + ACTION);
    pub.mocua = topic(_uid, _device_id, "pub/" + MOCUA);
    pub.getDatas = topic(_uid, _device_id, "pub/" + GETDATA);

    sub.isOnline = topic(_uid, _device_id, "sub/" + ONLINE);
    sub.action = topic(_uid, _device_id, "sub/" + ACTION);
    sub.mocua = topic(_uid, _device_id, "sub/" + MOCUA);
    sub.getDatas = topic(_uid, _device_id, "sub/" + GETDATA);

    // isOnline = topic(_uid, _device_id, ONLINE);
    // action = topic(_uid, _device_id, ACTION);
    // mocua = topic(_uid, _device_id, MOCUA);
    // getDatas = topic(_uid, _device_id, GETDATA);
    TOPIC = _uid + "/" + _device_id;
  }
};

