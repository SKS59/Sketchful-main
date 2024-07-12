import React, { useState } from 'react';
import UsernameInput from './UsernameInput';
import Whiteboard from './Whiteboard';
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
const App = () => {
    const [username, setUsername] = useState('');

    const handleGameEnd = () => {
        alert('Game over! Displaying scores...');
    };

    
    return (
        // <div className="App">
        //     {!username ? (
        //         <UsernameInput setUsername={setUsername} />
        //     ) : (
        //         <Whiteboard username={username} handleGameEnd={handleGameEnd} />
        //     )}
        // </div>
        <Whiteboard/>
    );
};

export default App;
