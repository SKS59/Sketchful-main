import React, { useState, useLayoutEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import "./App.css";

const Whiteboard = () => {
    const [username, setUsername] = useState("");
    const [roomNumber, setRoomNumber] = useState("");
    const [control, setControl] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [currentWord, setCurrentWord] = useState("");
    const [maskedWord, setMaskedWord] = useState("");
    const [timer, setTimer] = useState(0);
    const [leaderboard, setLeaderboard] = useState([]);
    const [winner, setWinner] = useState("");
    const [colour, setColour] = useState("#000000");
    const canvasRef = useRef(null);
    const messagesEndRef = useRef(null);
    const clientRef = useRef(null);
    const contextRef = useRef(null);

    useLayoutEffect(() => {
        const user = prompt("Please enter your username:");
        if (user) {
            setUsername(user);
        }

        const room = prompt("Please enter the room number:");
        if (room) {
            setRoomNumber(room);
        }

        const client = new Client({
            brokerURL: `ws://localhost:8080/whiteboard`,
            connectHeaders: {},
            debug: function (str) {
                console.log(str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            webSocketFactory: () => new SockJS(`http://localhost:8080/whiteboard`),
        });

        client.onConnect = () => {
            client.subscribe(`/topic/${room}/draw`, (message) => {
                const drawMessage = JSON.parse(message.body);
                draw(
                    drawMessage.x,
                    drawMessage.y,
                    drawMessage.isDrawing,
                    drawMessage.color
                );
            });

            client.subscribe(`/topic/${room}/control`, (message) => {
                const controlMessage = JSON.parse(message.body);
                setControl(controlMessage);
                if (controlMessage.word) {
                    setCurrentWord(controlMessage.word);
                    setMaskedWord(
                        controlMessage.user === username
                            ? controlMessage.word
                            : controlMessage.word.replace(/./g, "_ ")
                    );
                }
            });

            client.subscribe(`/topic/${room}/clear`, () => {
                clearCanvasLocal();
            });

            client.subscribe(`/topic/${room}/message`, (message) => {
                const msg = JSON.parse(message.body);
                setMessages((prev) => [...prev, msg]);
                setLeaderboard(Object.entries(msg.leaderboard));
            });

            client.subscribe(`/topic/${room}/timer`, (message) => {
                setTimer(parseInt(message.body));
            });

            client.subscribe(`/topic/${room}/leaderboard`, (message) => {
                const leaderboard = JSON.parse(message.body);
                setLeaderboard(Object.entries(leaderboard));
            });

            client.subscribe(`/topic/${room}/winner`, (message) => {
                setWinner(message.body);
            });

            client.publish({
                destination: `/app/${room}/join`,
                body: JSON.stringify({ username: user }),
            });
        };

        client.activate();
        clientRef.current = client;

        return () => client.deactivate();
    }, [username, roomNumber]);

    useLayoutEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useLayoutEffect(() => {
        if (timer > 0) {
            const timerId = setInterval(() => {
                setTimer((prevTimer) => prevTimer - 1);
            }, 1000);

            return () => clearInterval(timerId);
        }
    }, [timer]);

    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.lineCap = "round";
        context.lineWidth = 2;
        contextRef.current = context;
    }, []);

    const handleMouseDown = (event) => {
        if (control && control.user === username) {
            setIsDrawing(true);
            const { offsetX, offsetY } = event.nativeEvent;
            contextRef.current.beginPath();
            contextRef.current.moveTo(offsetX, offsetY);
            clientRef.current.publish({
                destination: `/app/${roomNumber}/draw`,
                body: JSON.stringify({
                    x: offsetX,
                    y: offsetY,
                    isDrawing: true,
                    color: colour,
                }),
            });
        }
    };

    const handleMouseMove = (event) => {
        if (isDrawing && control && control.user === username) {
            const { offsetX, offsetY } = event.nativeEvent;
            draw(offsetX, offsetY, true, colour);
            clientRef.current.publish({
                destination: `/app/${roomNumber}/draw`,
                body: JSON.stringify({
                    x: offsetX,
                    y: offsetY,
                    isDrawing: true,
                    color: colour,
                }),
            });
        }
    };

    const handleMouseUp = () => {
        if (isDrawing && control && control.user === username) {
            setIsDrawing(false);
            contextRef.current.closePath();
            clientRef.current.publish({
                destination: `/app/${roomNumber}/draw`,
                body: JSON.stringify({ isDrawing: false }),
            });
        }
    };

    const draw = (x, y, isDrawing, color) => {
        if (!contextRef.current) return;
        contextRef.current.strokeStyle = color;
        if (isDrawing) {
            contextRef.current.lineTo(x, y);
            contextRef.current.stroke();
        } else {
            contextRef.current.beginPath();
            contextRef.current.moveTo(x, y);
            contextRef.current.stroke();
        }
    };

    const clearCanvasLocal = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    const clearCanvas = () => {
        clientRef.current.publish({
            destination: `/app/${roomNumber}/clear`,
        });
    };

    const takeControl = () => {
        clientRef.current.publish({
            destination: `/app/${roomNumber}/control`,
            body: JSON.stringify({ user: username }),
        });
    };

    const sendMessage = () => {
        const isCorrectGuess = message.toLowerCase() === currentWord.toLowerCase();
        clientRef.current.publish({
            destination: `/app/${roomNumber}/message`,
            body: JSON.stringify({
                sender: username,
                content: message,
                isCorrectGuess,
            }),
        });
        setMessage("");
    };

    const startGame = () => {
        clientRef.current.publish({
            destination: `/app/${roomNumber}/start`,
        });
    };

    const endGame = () => {
        clientRef.current.publish({
            destination: `/app/${roomNumber}/end`,
        });
    };

    return (
        <div className="container1">
            <div className="left-section">
                {winner ? (
                    <div
                        className="border border-4 rounded p-4"
                        style={{ backgroundColor: "white" }}
                    >
                        <h1 className="display-3">Winner is {winner}</h1>
                        <h1 className="display-1 text-center">🏆</h1>
                    </div>
                ) : (
                    <>
                        <div className="d-flex justify-content-between w-100">
                            <div className="me-3">
                                <strong>Current Drawing :</strong> {control?.user}
                            </div>
                            <div className="ms-3">
                                <strong>Time Left:</strong> {timer} seconds
                            </div>
                            <div>
                                <label>Pick colour : </label>
                                <input
                                    type="color"
                                    value={colour}
                                    onChange={(e) => setColour(e.target.value)}
                                ></input>
                            </div>
                        </div>
                        <canvas
                            ref={canvasRef}
                            width={800}
                            height={600}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            style={{
                                border: "10px black solid",
                                backgroundColor: "whitesmoke",
                            }}
                        />
                    </>
                )}
            </div>

            <div className="right-section">
                <div className="d-flex justify-content-between w-100">
                    <div className="w-75">
                        <strong>Current Word:</strong> {maskedWord}
                    </div>
                    <div className="w-25 text-end">
                        <button className="btn btn-primary" onClick={startGame}>
                            Start Game
                        </button>
                    </div>
                </div>
                <strong className="mt-3">Leaderboard</strong>
                <div
                    className="border border-5 bg-light overflow-auto p-3"
                    style={{ maxHeight: "200px" }}
                >
                    <table className="table table-striped mt-2 text-center">
                        <tbody>
                            <tr>
                                <th>Rank</th>
                                <th>Username</th>
                                <th>Score</th>
                            </tr>
                            {leaderboard
                                .sort(([, a], [, b]) => b - a)
                                .map(([user, score], index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{user}</td>
                                        <td>{score}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
                <strong className="mt-3">Chat Box</strong>
                <div
                    className="border border-5 bg-light mt-3 p-3 w-100 h-50"
                    style={{ maxHeight: "200px", overflowY: "auto" }}
                >
                    <ul className="list-group mt-2">
                        {messages.map((msg, index) => (
                            <li
                                key={index}
                                className={`list-group-item ${msg.isCorrectGuess ? "list-group-item-success" : ""
                                    }`}
                            >
                                {msg.isCorrectGuess ? (
                                    <strong>{msg.sender} has guessed it correctly</strong>
                                ) : (
                                    <>
                                        <strong>{msg.sender}:</strong> {msg.content}
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                    <div ref={messagesEndRef} />
                </div>
                <div className="mt-3 d-flex">
                    <input
                        style={{ width: "550px" }}
                        type="text"
                        className="form-control border rounded"
                        value={message}
                        placeholder="Enter your guessing word here"
                        onChange={(e) => setMessage(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={sendMessage}>
                        Send
                    </button>
                </div>
                <div className="mt-3">
                    <button className="btn btn-primary me-2" onClick={takeControl}>
                        Start Drawing
                    </button>
                    <button className="btn btn-danger" onClick={clearCanvas}>
                        Clear Canvas
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Whiteboard;
