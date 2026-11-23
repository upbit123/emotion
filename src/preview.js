import p5 from 'p5';
import { createSketch } from './visual/sketch.js';

new p5(createSketch({ width: 400, height: 300 }), document.getElementById('canvas'));
