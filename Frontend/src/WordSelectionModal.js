import React from 'react';
import Modal from 'react-modal';

const WordSelectionModal = ({ isOpen, choices, onSelectWord }) => {
    return (
        <Modal isOpen={isOpen} ariaHideApp={false}>
            <h2>Select a Word</h2>
            <ul>
                {choices.map((choice, index) => (
                    <li key={index}>
                        <button onClick={() => onSelectWord(choice)}>{choice}</button>
                    </li>
                ))}
            </ul>
        </Modal>
    );
};

export default WordSelectionModal;

