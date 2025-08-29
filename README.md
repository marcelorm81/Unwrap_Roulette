# Fabric Tearing Simulation

An interactive web-based physics simulation that lets you tear through a red fabric sheet to reveal the underlying "SPRING INTO ACTION" text, just like the reference image!

## Features

- **Physics-Based Cloth Simulation**: Uses Verlet integration for realistic fabric physics
- **Interactive Tearing**: Click and drag to tear the fabric with your mouse
- **Realistic Fabric Behavior**: Cloth sags, stretches, bounces, and falls under gravity
- **Customizable Controls**: Adjust brush size and tear strength
- **Beautiful UI**: Modern interface with Krona One font and smooth animations
- **Mobile Support**: Touch-friendly controls for mobile devices
- **Sarcastic Commentary**: Random one-liners that change with each reset

## How It Works

1. **Cloth Mesh**: A 3D cloth mesh is simulated using a grid of points connected by springs
2. **Physics Engine**: Verlet integration provides smooth, realistic movement
3. **Tearing Mechanism**: When you drag your mouse, springs are broken in a circular area around your cursor
4. **Visual Rendering**: The fabric is drawn as filled polygons, with torn areas becoming transparent
5. **Background Text**: "SPRING INTO ACTION" is rendered underneath the fabric layer

## Controls

- **Brush Size**: Controls the radius of the tear area (10-100 pixels)
- **Tear Strength**: Determines how easily springs snap (0.1-2.0)
- **Reset Button**: Creates a new cloth and displays a new sarcastic message
- **Mouse/Touch**: Click and drag to tear the fabric

## Technical Details

- **Physics**: Simplified Verlet integration with spring constraints
- **Rendering**: HTML5 Canvas with optimized polygon drawing
- **Performance**: 60 FPS animation with efficient cloth mesh updates
- **Responsive**: Automatically adjusts to window size changes

## Getting Started

1. Open `index.html` in a modern web browser
2. Wait for the simulation to load
3. Click and drag on the red fabric to start tearing
4. Adjust controls to experiment with different tearing effects
5. Use the reset button to start over with a fresh cloth

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (touch support)

## Performance Tips

- Lower brush sizes for more precise tearing
- Higher tear strength for more dramatic effects
- The simulation automatically optimizes based on your device's performance

Enjoy destroying some virtual fabric! 🧵✂️ 