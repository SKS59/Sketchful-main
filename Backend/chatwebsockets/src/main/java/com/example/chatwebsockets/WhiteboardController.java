package com.example.chatwebsockets;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Controller;

@Controller
public class WhiteboardController {

    private final Map<String, List<String>> usersPerRoom = new HashMap<>();
    private final Map<String, Map<String, Integer>> leaderboardPerRoom = new HashMap<>();
    private final Random random = new Random();
    private final String[] fruitNames = {"apple", "banana", "cherry", "date", "fig", "grape", "kiwi", "lemon", "mango", "orange"};

    private String currentUser;
    private String currentWord;
    private int currentUserIndex = 0;
    private int round = 0; // Track the number of rounds

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private LeaderboardService leaderboardService;

    @MessageMapping("/{roomNumber}/draw")
    @SendTo("/topic/{roomNumber}/draw")
    public DrawMessage sendDrawing(@Payload DrawMessage drawMessage, @DestinationVariable String roomNumber) {
        System.out.println(drawMessage);
    	return drawMessage;
    }

    @MessageMapping("/{roomNumber}/control")
    @SendTo("/topic/{roomNumber}/control")
    public ControlMessage sendControl(@Payload ControlMessage controlMessage, @DestinationVariable String roomNumber) {
        return controlMessage;
    }

    @MessageMapping("/{roomNumber}/clear")
    @SendTo("/topic/{roomNumber}/clear")
    public String clear(@DestinationVariable String roomNumber) {
        return "clear";
    }

    @MessageMapping("/{roomNumber}/join")
    @SendTo("/topic/{roomNumber}/leaderboard")
    public Map<String, Integer> handleUserJoin(@Payload Map<String, String> payload, @DestinationVariable String roomNumber) {
        String username = payload.get("username");
        if (username != null && !username.trim().isEmpty()) {
            usersPerRoom.putIfAbsent(roomNumber, new ArrayList<>());
            leaderboardPerRoom.putIfAbsent(roomNumber, new HashMap<>());

            if (!usersPerRoom.get(roomNumber).contains(username)) {
                usersPerRoom.get(roomNumber).add(username);
                leaderboardService.addUser(username);
                leaderboardPerRoom.get(roomNumber).put(username, 0);
            }
        }
        System.out.println("((((((((((((((((((((");
        System.out.println(leaderboardPerRoom.get(roomNumber));
        System.out.println("))))))))))))))))))))");
        return leaderboardPerRoom.get(roomNumber);
    }

    @MessageMapping("/{roomNumber}/message")
    @SendTo("/topic/{roomNumber}/message")
    public Map<String, Object> handleMessage(@Payload Map<String, String> message, @DestinationVariable String roomNumber) {
        String sender = message.get("sender");
        String content = message.get("content");
        boolean isCorrectGuess = Boolean.parseBoolean(message.get("isCorrectGuess"));

        if (isCorrectGuess) {
            leaderboardService.incrementScore(sender);
            leaderboardPerRoom.get(roomNumber).put(sender, leaderboardService.getScore(sender));
            startNextTurn(roomNumber); // Move to the next turn immediately on a correct guess
        }

        Map<String, Object> response = new HashMap<>();
        response.put("content", content);
        response.put("sender", sender);
        response.put("isCorrectGuess", isCorrectGuess);
        response.put("leaderboard", leaderboardPerRoom.get(roomNumber));
        System.out.println("===================================");
        System.out.println(response.get("leaderboard"));
        System.out.println("===================================");
        
        return response;
    }

    @MessageMapping("/{roomNumber}/start")
    public void startGame(@DestinationVariable String roomNumber) {
        if (usersPerRoom.containsKey(roomNumber) && !usersPerRoom.get(roomNumber).isEmpty()) {
            round = 0; // Reset rounds when the game starts
            currentUserIndex = 0;
            startNextTurn(roomNumber);
        }
    }

    @Scheduled(fixedRate = 60000)
    public void handleScheduledTask() {
        for (String roomNumber : usersPerRoom.keySet()) {
            startNextTurn(roomNumber);
        }
    }

    private void startNextTurn(String roomNumber) {
        if (usersPerRoom.containsKey(roomNumber) && !usersPerRoom.get(roomNumber).isEmpty() && round < 2) { // Each user gets control twice
            currentUser = usersPerRoom.get(roomNumber).get(currentUserIndex);
            currentWord = fruitNames[random.nextInt(fruitNames.length)];
            currentUserIndex++;
            if (currentUserIndex >= usersPerRoom.get(roomNumber).size()) {
                currentUserIndex = 0;
                round++;
            }
            Map<String, Object> controlMessage = new HashMap<>();
            controlMessage.put("user", currentUser);
            controlMessage.put("word", currentWord);
            messagingTemplate.convertAndSend("/topic/" + roomNumber + "/control", controlMessage);
            messagingTemplate.convertAndSend("/topic/" + roomNumber + "/timer", 60); // Sending 60 seconds timer
        }else if (round >= 2) {
            declareWinner(roomNumber);
        }
    }
    private void declareWinner(String roomNumber) {
        Map<String, Integer> leaderboard = leaderboardPerRoom.get(roomNumber);

        if (leaderboard == null || leaderboard.isEmpty()) {
            return;
        }

        // Determine winners based on highest score
        int maxScore = Integer.MIN_VALUE;
        List<String> winners = new ArrayList<>();

        for (Map.Entry<String, Integer> entry : leaderboard.entrySet()) {
            String user = entry.getKey();
            int score = entry.getValue();
            if (score > maxScore) {
                maxScore = score;
                winners.clear();
                winners.add(user);
            } else if (score == maxScore) {
                winners.add(user);
            }
        }

        System.out.println(winners);
        // Create a comma-separated string of winners
        String winnerString = String.join(",", winners);

        // Publish winner message to room
        messagingTemplate.convertAndSend("/topic/" + roomNumber + "/winner", winnerString);
        messagingTemplate.convertAndSend("/topic/" + roomNumber + "/timer", 0);
    }
    
    @MessageMapping("/end")
    @SendTo("/topic/{roomNumber}/end")
    public void endGame(@DestinationVariable String roomNumber) {
        usersPerRoom.get(roomNumber).clear();
        leaderboardService.reset();
        currentUser = null;
        currentWord = null;
        currentUserIndex = 0;
        round = 0;
        messagingTemplate.convertAndSend("/topic/" + roomNumber + "/leaderboard", new HashMap<>());
    }

}
