import React, { useState } from 'react';

const UsernameInput = () => {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            setName(name);
        }
        
    };

    return (
        <div className="username-input">
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your username"
                />
                <button type="submit">Join</button>
            </form>
        </div>
    );
};

export default UsernameInput;
