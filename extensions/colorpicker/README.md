# Colorpicker

ES6 color picker extension for Base framework.

## Getting Started

### Installation

You can install colorpicker as part of  base.extensions.

```bash
npm install @baianat/base.extensions

# or using yarn
yarn add @baianat/base.extensions
```

If you want the standalone version.

```bash
npm install @baianat/colorpicker

yarn add @baianat/colorpicker
```

### Include necessary files

``` html
<head>
  <link rel="stylesheet" href="dist/css/colorpikcer.css">
</head>
<body>
    ...
    <script type="text/javascript" src="dist/js/colorpikcer.js"></script>
</body>
```

### HTML Layout

You need an input element to track the color value.

``` html
<input id="myPicker">

<script>
  const picker = new Colorpicker('#myPicker', {
    // default starter color
    defaultColor = '#ffffff',
    // color wheel radius in px
    radius = 200,
    // output color mode 'rgb', 'hex' or 'hsl'
    mode = 'rgb',
    // array of colors to fill recent colors, max of 6 colors
    recentColors = ['#c1c1c1', '#000000', '#ffffff'],
    // events to fire
    events = {
      // fires before selecting a color
      beforeSelect() {},
      // fires after selecting a color
      afterSelect() {},
      // fires before opening color picker menu
      beforeOpen() {},
      // fires after opening color picker menu
      afterOpen() {},
      // fires before clicking submit button
      beforeSubmit() {},
      // fires after clicking submit button
      afterSubmit() {},
      // fires on clicking on any part of the picker menu
      clicked() {}
    }
  });

  // to track color changes
  picker.el.addEventListener('change', () => {
    // do something great!
  })
</script>
```

### Methods

You can call method on `Colorpicker` instance

```js
const newPicker = new Picker('#myPicker');
newPicker.selectColor('#ff00ff');
```

| Method | Argument | Description |
| ------ | -------- | ----------- |
| `selectColor` | [String] color, [Bool] mute  | you can change the selected with `color` argument. If you want to stop the picker from dispatching events, you can set `mute` to true. It's false by default. |
| `getColorFromSliders` | | It returns the rgb sliders values as string e.g. `"rgb(71, 182, 148)"`|
| `getColorFromWheel` | [Object] mouse | It accepts an object, holds the x and y location on the wheel `{x: 100, y: 100}`, then returns its rgb value |
| `togglePicker` | | show/hide picker menu |
| `closePicker` | | hide picker menu |
| `openPicker` | | show picker menu |

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2017 [Baianat](http://baianat.com)
