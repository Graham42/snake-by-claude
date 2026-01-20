# Snake Game

A classic Snake game implementation with modern design and full mobile support. Built with vanilla HTML, CSS, and JavaScript.

## Overview

This is a browser-based Snake game featuring a clean, modern/minimal design aesthetic. The game includes both keyboard and touch controls, making it playable on desktop and mobile devices.

## Features

### Gameplay
- Classic Snake mechanics on a 20×20 grid
- Eat food to grow longer and increase your score
- Progressive difficulty (game speed increases as you score points)
- Game over on collision with walls or self
- Score tracking (+10 points per food)

### Controls
- **Desktop**: Arrow keys or WASD
- **Mobile**: Swipe gestures (up, down, left, right)
- **Start/Restart**: SPACE key or tap the start button

### Design
- Modern/minimal visual style
- Clean color palette with rounded corners and subtle shadows
- Smooth animations and transitions
- Fully responsive layout (desktop, tablet, mobile)
- Dark background with bright game elements

## Requirements

### Technology Stack
- Vanilla HTML/CSS/JavaScript (no frameworks or libraries)
- HTML5 Canvas for game rendering
- Pure CSS for styling and animations

### Game Requirements
- **Grid**: 20×20 cell grid
- **Initial Speed**: 150ms per frame
- **Speed Increment**: Increases by 5ms per food eaten
- **Minimum Speed**: 50ms (maximum difficulty)
- **Points per Food**: 10 points
- **Initial Snake Length**: 3 segments

### Visual Style Requirements
- **Background**: Dark gradient (#1a1a2e to #16213e)
- **Snake**: Bright green (#00ff41)
- **Food**: Red (#ff6b6b)
- **Container**: White card with rounded corners (16px)
- **Elements**: Rounded corners (8px) with shadows
- **Typography**: System font stack for native feel

### Control Requirements
- Keyboard support (arrow keys and WASD)
- Touch/swipe gesture support for mobile
- Direction buffering to prevent 180° turns
- Prevent page scrolling during gameplay on mobile

### Responsive Requirements
- **Desktop**: Canvas 600×600px
- **Tablet**: Canvas scales to fit viewport
- **Mobile**: Canvas 90vw (max 400px), touch-optimized controls
- Touch targets minimum 44×44px for accessibility

## How to Run

1. Clone or download this repository
2. Open `index.html` in a web browser
3. No build process or dependencies required!

```bash
# Option 1: Direct open
open index.html

# Option 2: Local server (optional)
python -m http.server 8000
# Then visit http://localhost:8000
```

## How to Play

1. Open the game in your browser
2. Press SPACE or tap the "Start Game" button
3. Control the snake to eat the red food
4. Avoid hitting the walls or your own tail
5. Try to achieve the highest score possible!

## Project Structure

```
snake/
├── index.html    # Game structure and layout
├── styles.css    # Modern/minimal styling
├── game.js       # Complete game logic
└── README.md     # This file
```

## Technical Details

### Architecture
The game is organized into modular components:

- **Game Module**: Main controller, game loop, lifecycle management
- **Snake Module**: Snake initialization, movement, collision detection
- **Food Module**: Food generation, collision detection
- **Input Module**: Keyboard and touch event handling
- **Render Module**: Canvas rendering (snake, food)
- **UI Module**: Score display, overlay management

### Game Loop
- Uses `setTimeout` for precise speed control
- Speed dynamically adjusts based on score
- Frame-independent collision detection

### Input Handling
- Direction buffering prevents multiple inputs per frame
- 180° turn prevention (can't reverse into yourself)
- Swipe detection with minimum distance threshold (30px)
- Touch events with `preventDefault` to avoid scrolling

### Mobile Optimizations
- Responsive canvas sizing
- Touch-action: none to prevent unwanted gestures
- Minimum tap target sizes (44×44px)
- Swipe gesture recognition
- Viewport meta tag to prevent zoom

## Browser Compatibility

Tested and works on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

Requires:
- HTML5 Canvas support
- ES6 JavaScript support
- Touch events API (for mobile)

## Future Enhancements

Possible features to add:
- Pause/resume functionality
- High score persistence (localStorage)
- Multiple difficulty levels
- Different game modes (obstacles, speed modes)
- Sound effects and background music
- Leaderboard system
- Custom themes

## License

Free to use and modify for personal and educational purposes.

## Credits

Built with vanilla JavaScript following web standards best practices.
