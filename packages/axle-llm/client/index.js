// This is the new main entry point for the client bundle.
// It ensures React is bundled and exposed globally before the engine runs.
import React from 'react';
import ReactDOM from 'react-dom/client';

// Make React and ReactDOM globally available for the engine and components.
window.React = React;
window.ReactDOM = ReactDOM;
window.axle = { components: {} }; // Initialize the component namespace.

// Now that globals are set, run the actual engine logic.
import './engine-client.js';