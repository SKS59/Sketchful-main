package com.example.chatwebsockets;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class LeaderboardService {
	private final Map<String, Integer> leaderboard = new HashMap<>();

    public void addUser(String username) {
        leaderboard.putIfAbsent(username, 0);
    }

    public void incrementScore(String username) {
        leaderboard.put(username, leaderboard.getOrDefault(username, 0) + 1);
    }

    public int getScore(String username) {
        return leaderboard.getOrDefault(username, 0);
    }

    public Map<String, Integer> getLeaderboard() {
        return leaderboard;
    }
    public void reset() {
        leaderboard.clear();
    }

}

