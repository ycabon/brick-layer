define([
], function() {

  /**
   * Sample the average color in a imageData
   * 
   * @param {vec3} out output vector containing the sampled color
   * @param {ImageData} imageData input ImageData data to sample from
   * @param {*} x coordinate of the area from imageData to sample from
   * @param {*} y coordinate of the area from imageData to sample from
   * @param {*} width size of the area from imageData to sample from
   * @param {*} height size of the area from imageData to sample from
   */
  function sampleAverageColor(out, imageData, x, y, width, height) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;

    var numSamples = 0;

    // Sample every 5 pixel
    var sampleStride = 5;

    var data = imageData.data;
    var w = imageData.width;

    for (var j = y; j < y + height; j += sampleStride) {
      for (var i = x; i < x + width; i += sampleStride) {
        // imageData is a flat array of 4 color components
        // calculate the absolute position in the buffer.
        var p = (j * w + i) * 4;
        
        out[0] += data[p];
        out[1] += data[p + 1];
        out[2] += data[p + 2];

        numSamples++;
      }
    }

    out[0] = Math.floor(out[0] / numSamples);
    out[1] = Math.floor(out[1] / numSamples);
    out[2] = Math.floor(out[2] / numSamples);

    return out;
  }

  /**
   * Snap a rgb color to a palette
   */
  function colorToPalette(out, hsl, palette) {
    // convert the color to HSL to snap the color in linear space

    // find the closest hue
    var distances = palette.map(function(color) {
      return Math.abs(Math.sqrt(Math.pow(color[0] - hsl[0], 2) + Math.pow(color[1] - hsl[1], 2) + Math.pow(color[2] - hsl[2], 2)));
    })
    var smallest = Math.min.apply(null, distances);
    var closestColor = palette[distances.indexOf(smallest)];

    out[0] = closestColor[0];
    out[1] = closestColor[1];
    out[2] = closestColor[2];

    return out;
  }

  function rgb2hsl(out, rgb) {
    // http://www.niwa.nu/2013/05/math-behind-colorspace-conversions-rgb-hsl/
    var r = rgb[0] / 255;
    var g = rgb[1] / 255;
    var b = rgb[2] / 255;

    var min = Math.min(r, g, b);
    var max = Math.max(r, g, b);
    var delta = max - min;
    
    out[0] = out[1] = out[2] = 0;

    // Luminescance
    out[2] = (min + max) * 0.5;

    // calculate saturation
    // no saturation if the rgb values are the same
    if (delta !== 0) {
      if (out[2] < 0.5) {
        out[1] = delta / (2 * out[2]);
      }
      else {
        out[1] = delta / (2 - 2 * out[2]);
      }
    }

    // calculate hue
    if (delta > 0) {
      if (r === max) {
        out[0] = (g - b) / delta;
      }
      else if (g === max) {
        out[0] = 2.0 + (b - r) / delta;
      }
      else if (b === max) {
        out[0] = 4.0 + (r - g) / delta;
      }

      out[0] = out[0] * 60;
    }

    out[1] = Math.round(out[1] * 100);
    out[2] = Math.round(out[2] * 100);

    return out;
  }

  function contrast(out, rgb, contrast) {
    http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/

    var factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    out[0] = clamp(factor * (rgb[0] - 128) + 128, 0, 255);
    out[1] = clamp(factor * (rgb[1] - 128) + 128, 0, 255);
    out[2] = clamp(factor * (rgb[2] - 128) + 128, 0, 255);
    
    return out;
  }

  function clamp(value, min, max) {
    return value < min ? min : value > max ? max : value;
  }

  return {
    colorToPalette: colorToPalette,
    contrast: contrast,
    rgb2hsl: rgb2hsl,
    sampleAverageColor: sampleAverageColor
  };

})