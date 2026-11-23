#include <WiFi.h>
#include <WebServer.h>
#include <WiFiAP.h>
String command;             //String to store app command state.

WebServer server(80);

int dem=0, quaTrinh=0;

void handleRoot() {
  server.send(200, "text/html", String(device_id));   // Send HTTP status 200 (Ok) and send some text to the browser/client
}

void handleNotFound(){
  server.send(404, "text/plain", "404: Not found"); // Send HTTP status 404 (Not Found) when there's no handler for the URI in the request
}
 
void HTTP_handleRoot() {
  server.send (200, "text/html", "<title>" + String(device_id) + "</title>" + String(device_id));
}

void createServer(){
  //if (!WiFi.softAP(ssid_ap, password_ap)) {
  if (!WiFi.softAP(device_id)) {
    //log_e("Soft AP creation failed.");
    while(1);
  }

  Serial.print("AP IP address: ");
  Serial.println(WiFi.softAPIP());

  // Starting WEB-server 
  server.on("/", HTTP_handleRoot);
  server.onNotFound(handleNotFound);
  server.begin(); 
}

void connectApp(){
  server.handleClient();
  command = server.arg("SSID");
  if(command != "" && ssid_home == ""){
    ssid_home = command;
    Serial.print("Set SSID: ");
    Serial.println(ssid_home);
  }
  
  command = server.arg("PASS");
  if(command != "" && pass_home == ""){
    pass_home = command;
    Serial.print("Set PASS: ");
    Serial.println(pass_home);
  }
  
  command = server.arg("USER");
  if(command != "" && user == ""){
    user = command;
    Serial.print("Set User: ");
    Serial.println(user);
  }

  command = server.arg("IP");
  if(command != "" && ip == ""){
    ip = command;
    Serial.print("IP MQTT: ");
    Serial.println(ip);
  }

  command = server.arg("PORT");
  if(command != "" && port == ""){
    port = command;
    Serial.print("PORT MQTT: ");
    Serial.println(port);
  }
  
  if(ssid_home != "" && pass_home != "" && user != "" && ip != "" && port != ""){
    writeUserToEEPROM(user);
    writeSsidPassToEEPROM(ssid_home, pass_home);
    writeIpPortToEEPROM(ip, port);
    writeRunSystem();
    Serial.println("Connect done!");
    delay(3000);
    ESP.restart();;
  }
}
