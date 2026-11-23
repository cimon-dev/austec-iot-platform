class CuaCuon {
private:
	const uint8_t CB_UP = 7;
	const uint8_t CB_DOWN = 6;
	const uint8_t BIEN_TRO = 18;
	const uint8_t RL_STOP = 3;
	const uint8_t RL_DOWN = 4;
	const uint8_t RL_UP = 5;
	const uint8_t RF = 1;

public:
	int action = 0;
	int mocua = -1;
	int setup = 0;
	int clear = 0;
	bool trangthaicuoi = HIGH;

	void begin() {
		pinMode(CB_UP, INPUT);
		pinMode(CB_DOWN, INPUT);
		pinMode(BIEN_TRO, INPUT);
		pinMode(RL_UP, OUTPUT);
		pinMode(RL_DOWN, OUTPUT);
		pinMode(RL_STOP, OUTPUT);
		//pinMode(RF, OUTPUT);
	}

	int loop() 
	{
    if(ESP32) return 0;
		if (digitalRead(CB_UP) == 0) {
			action = 4; // mo hoan toan
			return 4;
		}
		if (digitalRead(CB_DOWN) == 0) {
			action = 5; // dong hoan toan
			return 5;
		}
		return 0;
	}

	void moCua() {
    Serial.println("Mo cua");
		digitalWrite(RL_UP, HIGH);
		delay(500);
		digitalWrite(RL_UP, LOW);
	}

	void dongCua() {
    Serial.println("Dong cua");
		digitalWrite(RL_DOWN, HIGH);
		delay(500);
		digitalWrite(RL_DOWN, LOW);
	}

	void dung() 
	{
    Serial.println("Dung");
		digitalWrite(RL_STOP, HIGH);
		delay(500);
		digitalWrite(RL_STOP, LOW);
	}
	void RF_setup()
	{
			Serial.println("thiet lap tay cam");
			pinMode(RF, OUTPUT);
			digitalWrite(RF, HIGH);
			delay(300);
			digitalWrite(RF,LOW);
			pinMode(RF,INPUT);
			bool trangthai = digitalRead(RF);
			if (trangthaicuoi == HIGH && trangthai == LOW)
				{
					setup++;
					delay(10);
				}
				trangthaicuoi == trangthai;
	}
	void RF_clear()
	{
			int n=0;
			Serial.println("xoa tay cam");
			while(n<8)
			{
					pinMode(RF,OUTPUT);
					digitalWrite(RF, HIGH);
					delay(300);
					digitalWrite(RF,LOW);	
					delay(300);
					n++;
			}
			pinMode(RF,INPUT);
			if(digitalRead(RF==1))
				{
					if(digitalRead(RF==0))
					{
						n++;
					}					
					delay(10);
				}
	}
};

