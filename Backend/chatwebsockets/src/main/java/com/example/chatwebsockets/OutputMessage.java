package com.example.chatwebsockets;

public class OutputMessage {
	private String from;
	private String text;
	private String time;
	public OutputMessage(String from2, String text2, String time2) {
		from=from2;
		text=text2;
		time=time2;
	}
	public String getFrom() {
		return from;
	}
	public void setFrom(String from) {
		this.from = from;
	}
	public String getText() {
		return text;
	}
	public void setText(String text) {
		this.text = text;
	}
	public String getTime() {
		return time;
	}
	public void setTime(String time) {
		this.time = time;
	}
	
}
