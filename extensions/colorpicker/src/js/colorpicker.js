import Slider from '../../../slider/src/js/slider';
import {
  call,
  select,
  getArray,
  stringToDOM,
  isElementClosest,
  mouseDownHandler
} from '../../../_assets/js/util';
import {
  getRandomColor,
  toHex,
  toRgb,
  toHsl,
  isAColor
} from 'color-fns';

class Colorpicker {
  constructor (selector, settings) {
    this.el = select(selector);
    this.settings = {
      ...Colorpicker.defaults,
      ...settings,
      picker: {
        ...Colorpicker.defaults.picker,
        ...settings.picker
      },
      recentColors: {
        ...Colorpicker.defaults.recentColors, 
        ...settings.recentColors
      },
      menu: {
        ...Colorpicker.defaults.menu, 
        ...settings.menu
      }
    };
    this.init();
  }

  init () {
    this.currentColor = this.settings.defaultColor;
    this.lastMove = { x: 0, y: 0 };
    this.isMenuActive = false;
    this._initElements();
    this._initEvents();
    this.selectColor(this.settings.defaultColor, true);
    this.updateCursor();
  }

  _initElements () {
    this.sliders = {};
    this.mouse = { x: 0, y: 0 };
    // create colorpicker element
    this.picker = document.createElement('div');
    this.menu = stringToDOM('<div class="picker-menu" tabindex="-1"></div>');
    this.guide = stringToDOM(`<button class="picker-guide">${this.settings.guideIcon}</button>`);

    this.submit = stringToDOM(`
    <button class="picker-submit">
      <svg class="icon" viewBox="0 0 24 24">
        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
      </svg>
    </button>`);
    this.menuInput = stringToDOM('<div class="picker-input"></div>');

    // append colorpicker elements
    this.picker.appendChild(this.menu);
    this.picker.appendChild(this.guide);
    if (this.settings.picker && this.settings.picker.mode === 'wheel') {
      this._initWheel();
    }
    if (this.settings.picker && this.settings.picker.mode === 'square') {
      this._initSquare();
    }
    if (this.settings.rgbSliders) {
      this._initRGBSliders();
    }
    this.menu.appendChild(this.menuInput);
    if (this.settings.recentColors) {
      this._initRecentColors();
    }

    this.el.parentNode.insertBefore(this.picker, this.el);
    this.el.classList.add('picker-value');
    this.picker.classList.add('picker');
    this.menuInput.appendChild(this.el);
    this.menuInput.appendChild(this.submit);
    this.guide.style.color = this.settings.defaultColor;
    this.guide.style.fill = this.settings.defaultColor;
    setTimeout(this.closePicker.bind(this), 1);
  }

  _initSquare () {
    this.square = stringToDOM(`
      <div class="picker-square">
        <canvas class="picker-canvas"></canvas>
        <canvas class="picker-squareStrip"></canvas>
        <div class="picker-cursor"></div>
      </div>`);

    this.currentHue = 'hsl(0, 100%, 50%)';
    this.canvas = this.square.querySelector('.picker-canvas');
    this.strip = this.square.querySelector('.picker-squareStrip');
    this.cursor = this.square.querySelector('.picker-cursor');
    this.menu.appendChild(this.square);

    // setup canvas
    const edge = this.settings.picker.edge;
    this.canvas.width = edge;
    this.canvas.height = edge;
    this.strip.width = this.settings.picker.edge / 10;
    this.strip.height = edge;
    this.ctx = this.canvas.getContext('2d');
    this.stripCtx = this.strip.getContext('2d');

    this.stripCtx.rect(0, 0, this.strip.width, this.strip.height);
    const hue = this.stripCtx.createLinearGradient(0, 0, 0, this.strip.height);
    for (let angle = 0; angle < 360; angle += 1) {
      hue.addColorStop(angle / 359, `hsl(${angle}, 100%, 50%)`);
    }
    this.stripCtx.fillStyle = hue;
    this.stripCtx.fill();
    const squareThreshold = this.settings.picker.edge - 1;
    const updateColor = (event) => {
      if (event.target !== this.canvas) {
        return;
      }
      let { x, y } = this.getMouseCords(event);
      this.mouse = { x: Math.min(x, squareThreshold), y: Math.min(y, squareThreshold) };
      const color = this.getColorCanvas(this.mouse, this.ctx);
      this.selectColor(color);
      this.updateCursor(this.mouse);
    }

    const updateHue = (event) => {
      if (event.target !== this.strip) return;
      const mouse = this.getMouseCords(event);
      this.currentHue = this.getColorCanvas(mouse, this.stripCtx);
      this.updateSquareColors();
      const color = this.getColorCanvas(this.mouse, this.ctx);
      this.selectColor(color);
    }

    this.updateSquareColors();

    // add event listener
    this.canvas.addEventListener('mousedown', (event) => mouseDownHandler(event)(updateColor));
    this.strip.addEventListener('mousedown', (event) => mouseDownHandler(event)(updateHue));
  }

  _initWheel () {
    this.wheel = stringToDOM(`
      <div class="picker-wheel">
        <canvas class="picker-canvas"></canvas>
        <div class="picker-cursor"></div>
      </div>`);
    this.saturation = stringToDOM('<input class="picker-saturation" type="number" min="0" max="100" value="0">');

    this.canvas = this.wheel.querySelector('.picker-canvas');
    this.cursor = this.wheel.querySelector('.picker-cursor');
    this.menu.appendChild(this.wheel);

    if (this.settings.picker.saturation) {
      this.menu.appendChild(this.saturation);
      this.sliders.saturation = new Slider(this.saturation, {
        gradient: ['#FFFFFF', '#000000'],
        label: false
      });
      this.saturation.addEventListener('change', () => {
        window.requestAnimationFrame(() => {
          this.updateWheelColors();
        })
      });
    }

    // setup canvas
    this.canvas.width = this.settings.picker.radius;
    this.canvas.height = this.settings.picker.radius;
    this.ctx = this.canvas.getContext('2d');

    // draw wheel circle path
    this.circle = {
      path: new Path2D(), // eslint-disable-line
      xCords: this.canvas.width / 2,
      yCords: this.canvas.height / 2,
      radius: this.canvas.width / 2
    }
    this.circle.path.moveTo(this.circle.xCords, this.circle.yCords);
    this.circle.path.arc(
      this.circle.xCords,
      this.circle.yCords,
      this.circle.radius,
      0,
      360
    );
    this.circle.path.closePath();

    const updateColor = (event) => {
      // check if mouse outside the wheel
      const mouse = this.getMouseCords(event);
      if (this.ctx.isPointInPath(this.circle.path, mouse.x, mouse.y)) {
        let color = this.getColorCanvas(mouse, this.ctx);
        this.selectColor(color);
        this.updateCursor(mouse);
      }
    }
    // add event listener
    this.wheel.addEventListener('mousedown', (event) => mouseDownHandler(event)(updateColor));

    this.updateWheelColors();
    this.updateCursor();
  }

  _initRGBSliders () {
    this.rgbSliders = {
      red: stringToDOM('<input id="red" type="number" min="0" max="255" value="0">'),
      green: stringToDOM('<input id="green" type="number" min="0" max="255" value="0">'),
      blue: stringToDOM('<input id="blue" type="number" min="0" max="255" value="0">')
    }

    this.menu.appendChild(this.rgbSliders.red);
    this.menu.appendChild(this.rgbSliders.green);
    this.menu.appendChild(this.rgbSliders.blue);

    Object.keys(this.rgbSliders).forEach((key) => {
      this.sliders[key] = new Slider(this.rgbSliders[key], {
        gradient: ['#000000', '#FFFFFF'],
        label: false,
        editable: true,
        reverse: true
      });
    });

    // add event listener
    Object.keys(this.rgbSliders).forEach((key) => {
      this.rgbSliders[key].addEventListener('change', () => {
        const color = this.getColorFromSliders();
        window.requestAnimationFrame(() => {
          this.selectColor(color);
          this.updateCursor();
        })
      });
    });
  }

  _initRecentColors () {
    this.recentColors = this.settings.recentColors.colors;
    this.recent = stringToDOM('<div class="picker-recent"></div>');

    this.menu.appendChild(this.recent);

    this.recentColors.forEach((color) => {
      const recentColor = document.createElement('a');
      recentColor.classList.add('picker-color');
      recentColor.style.backgroundColor = color;
      this.recent.appendChild(recentColor);
      recentColor.addEventListener('mousedown', (event) => event.preventDefault())
      recentColor.addEventListener('click', (event) => {
        this.selectColor(color);
        this.updateCursor();
      });
    });
  }

  _initEvents () {
    // eslint-disable-next-line
    this.events = [new Event('input'), new Event('change')];

    this.guide.addEventListener('click', () => {
      call(this.settings.events.beforeOpen);
      this.togglePicker();
    });

    if (this.settings.menu.draggable) {
      this.menu.addEventListener('mousedown', (event) => {
        if (event.target !== this.menu || event.button !== 0) return;
        let startPosition = {}
        let endPosition = {}
        let delta = {}

        event.preventDefault();
        startPosition.x = event.clientX;
        startPosition.y = event.clientY;

        const mousemoveHandler = (evnt) => {
          window.requestAnimationFrame(() => {
            endPosition.x = evnt.clientX;
            endPosition.y = evnt.clientY;
            delta.x = this.lastMove.x + endPosition.x - startPosition.x;
            delta.y = this.lastMove.y + endPosition.y - startPosition.y;
            this.menu.style.transform = `translate(${delta.x}px, ${delta.y}px)`;
          });
        }
        const mouseupHandler = () => {
          this.lastMove = delta;
          document.removeEventListener('mousemove', mousemoveHandler);
          document.removeEventListener('mouseup', mouseupHandler);
        }
        document.addEventListener('mousemove', mousemoveHandler);
        document.addEventListener('mouseup', mouseupHandler);
      });
    }

    this.el.addEventListener('focus', (event) => {
      const edit = () => {
        this.selectColor(this.el.value, true);
        this.updateCursor();
      };
      const release = () => {
        this.el.removeEventListener('change', edit);
        this.el.removeEventListener('blur', release);
      }
      this.el.addEventListener('change', edit);
      this.el.addEventListener('blur', release);
    });

    this.submit.addEventListener('click', (event) => {
      call(this.settings.events.beforeSubmit);
      this.selectColor(this.el.value);
      this.updateCursor();
      if (this.settings.menu.hideWhenSubmit) {
        this.closePicker();
      }
      this.updateRecentColors(this.currentColor);
      call(this.settings.events.afterSubmit);
    });
  }

  updateWheelColors () {
    const x = this.circle.xCords;
    const y = this.circle.yCords;
    const radius = this.circle.radius;
    const saturation = this.settings.picker.saturation ? this.saturation.value : 100
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let angle = 0; angle < 360; angle += 1) {
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
      const startAngle = (angle - 2) * Math.PI / 180;
      const endAngle = (angle + 2) * Math.PI / 180;

      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.arc(x, y, radius, startAngle, endAngle);
      this.ctx.closePath();

      gradient.addColorStop(0, `hsl(${angle}, ${saturation}%, 100%)`);
      gradient.addColorStop(0.5, `hsl(${angle}, ${saturation}%, 50%)`);
      gradient.addColorStop(1, `hsl(${angle}, ${saturation}%, 0%)`);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }

  updateSquareColors () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = this.currentHue;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let grdBlack = this.ctx.createLinearGradient(0, 0, this.canvas.width, 0);
    grdBlack.addColorStop(0, `hsl(0, 0%, 50%)`);
    grdBlack.addColorStop(1, `hsla(0, 0%, 50%, 0)`);
    this.ctx.fillStyle = grdBlack;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    let grdWhite = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    grdWhite.addColorStop(0, `hsl(0, 0%, 100%)`);
    grdWhite.addColorStop(0.5, `hsla(0, 0%, 100%, 0)`);
    grdWhite.addColorStop(0.5, `hsla(0, 0%, 0%, 0)`);
    grdWhite.addColorStop(1, `hsl(0, 0%, 0%) `);
    this.ctx.fillStyle = grdWhite;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  updateRecentColors (newColor) {
    // update recent color array
    if (!newColor) return;
    if (this.recentColors.length >= this.settings.recentColors.max) {
      this.recentColors.shift();
      this.recent.removeChild(this.recent.firstChild);
    }

    this.recentColors.push(newColor);
    const recentColor = document.createElement('a');
    recentColor.classList.add('picker-color');
    recentColor.style.backgroundColor = newColor;
    this.recent.appendChild(recentColor);
    recentColor.addEventListener('click', (event) => {
      event.preventDefault();
      this.selectColor(newColor);
      this.updateCursor();
    });
  }

  updateSlidersInputs (slider) {
    const cl = this.currentColor;
    // console.log(cl)
    this.sliders.red.newGradient([`rgb(0,${cl.green},${cl.blue})`, `rgb(255,${cl.green},${cl.blue})`]);
    this.sliders.green.newGradient([`rgb(${cl.red},0,${cl.blue})`, `rgb(${cl.red},255,${cl.blue})`]);
    this.sliders.blue.newGradient([`rgb(${cl.red},${cl.green},0)`, `rgb(${cl.red},${cl.green},255)`]);
  }

  updateCursor (mouse) {
    if (mouse) {
      this.cursor.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
      return;
    }

    const hslColor = toHsl(this.currentColor, true);
    if (this.settings.picker.mode === 'wheel') {
      const r = (100 - hslColor[3]) * (this.settings.picker.radius / 200);
      const ratio = this.settings.picker.radius / 2;
      this.mouse = getCartesianCoords(r, hslColor[1] / 360);
      this.cursor.style.transform = `translate3d(${this.mouse.x + ratio}px, ${this.mouse.y + ratio}px, 0)`;
    }
    if (this.settings.picker.mode === 'square') {
      const x = (hslColor[2] / 100) * (this.settings.picker.edge);
      const y = ((100 - hslColor[3]) / 100) * (this.settings.picker.edge);
      this.mouse = { x: x, y: y };
      this.cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
  }

  selectColor (color, mute = false) {
    if (!isAColor(color)) return;
    if (!mute) call(this.settings.events.beforeSelect);
    const rgbColor = toRgb(color);
    const hexColor = toHex(color);
    const hslColor = toHsl(color);
    this.el.value =
      this.settings.model === 'hex' ? hexColor
        : this.settings.model === 'hsl' ? hslColor
          : this.settings.model === 'rgb' ? rgbColor
            : '';

    this.currentColor = rgbColor;
    this.guide.style.color = color;
    this.guide.style.fill = color;
    if (this.settings.rgbSliders) {
      this.sliders.red.update(rgbColor.red, true);
      this.sliders.green.update(rgbColor.green, true);
      this.sliders.blue.update(rgbColor.blue, true);
      this.updateSlidersInputs();
    }
    if (
      this.settings.picker.mode === 'wheel' &&
      this.settings.picker.saturation
    ) {
      this.sliders.saturation.update(hslColor.sat);
      this.sliders.saturation.newGradient(['#FFFFFF', hexColor.toString()]);
    }

    if (this.settings.picker.mode === 'square') {
      this.currentHue = `hsl(${hslColor.hue}, 100%, 50%)`;
      this.updateSquareColors()
    }

    if (mute) return;
    call(this.settings.events.afterSelect);
    this.events.forEach((event) => this.el.dispatchEvent(event));
  }

  getColorFromSliders () {
    const red = this.rgbSliders.red.value;
    const green = this.rgbSliders.green.value;
    const blue = this.rgbSliders.blue.value;
    return `rgb(${red}, ${green}, ${blue})`;
  }

  getColorCanvas (mouse, ctx) {
    const imageData = ctx.getImageData(mouse.x, mouse.y, 1, 1).data;
    return `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
  }

  getMouseCords (event) {
    const mouse = {
      x: event.offsetX,
      y: event.offsetY
    };
    return mouse;
  }

  togglePicker () {
    if (this.isMenuActive) {
      this.closePicker();
      return;
    }
    this.openPiker();
  }

  closePicker () {
    this.menu.classList.add('is-hidden');
    this.isMenuActive = false;
    document.removeEventListener('click', this.documentCallback)
  }

  openPiker () {
    this.menu.classList.remove('is-hidden');
    this.isMenuActive = true;
    const documentCallback = (evnt) => {
      if (!isElementClosest(evnt.target, this.menu) && !isElementClosest(evnt.target, this.guide)) {
        this.closePicker();
        return;
      }
      call(this.settings.events.clicked);
    };
    this.documentCallback = documentCallback.bind(this);
    document.addEventListener('click', this.documentCallback);
    call(this.settings.events.afterOpen);
  }
  static defaults = {
    defaultColor: getRandomColor(),
    model: 'rgb',
    events: {},
    picker: {
      mode: 'wheel',
      radius: 200,
      saturation: true,
      edge: 190
    },
    recentColors: {
      max: 6,
      colors: getArray(6, getRandomColor)
    },
    menu: {
      draggable: true,
      hideWhenSubmit: true
    },
    rgbSliders: true,
    guideIcon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="12"/></svg>`
  }
}

function getCartesianCoords (r, theta) {
  return {
    x: r * Math.cos(theta * Math.PI * 2),
    y: r * Math.sin(theta * Math.PI * 2)
  };
}

export default Colorpicker;
