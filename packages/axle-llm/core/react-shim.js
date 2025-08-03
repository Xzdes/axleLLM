// packages/axle-llm/core/react-shim.js

// This file is used by esbuild's `inject` feature.
// It ensures that React and ReactDOM are included in the client-side bundle,
// and it provides them as modules that can be imported.
// The build-client.js script then takes the bundled output and exposes
// these modules as global `window.React` and `window.ReactDOM` variables.

import React from 'react';
import ReactDOM from 'react-dom/client';

export { React, ReactDOM };