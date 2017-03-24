define([
  "require",

  "dojo/promise/all",

  "esri/request",
  
  "esri/layers/BaseTileLayer",
  "esri/layers/support/TileInfo",

  "esri/geometry/Extent",
  "esri/geometry/SpatialReference",

  "./colorUtils"
],
function(
  require,
  all,
  esriRequest,
  BaseTileLayer, TileInfo,
  Extent, SpatialReference,
  colorUtils
) {

  var brickStylePaths = {
    default: "./bricktop.png",
    lego: "./LegoStud.png"
  }

  var PointBinLayer = BaseTileLayer.createSubclass({
    declaredClass: "PointBinLayer",

    properties: {
      brickSize: 4,

      layer: null,

      title: {
        aliasOf: "layer.title"
      },

      tileInfo: {
        value: TileInfo.create()
      },

      fullExtent: {
        aliasOf: "layer.fullExtent"
      },

      brickStyle: "default"
    },

    load: function() {
      this.addResolvingPromise(this.layer.load());

      var brickPath = brickStylePaths[this.brickStyle] && require.toUrl(brickStylePaths[this.brickStyle]) || this.brickStyle;

      if (brickPath) {
        this.addResolvingPromise(
          esriRequest(brickPath, {
            responseType: "image",
            allowImageDataAccess: true
          })
          .then(function(response) {
            this._brickTop = response.data;
          }.bind(this))
          .otherwise(function() {
            this._brickTop = null;
          }.bind(this))
        );
      }
    },

    fetchTile: function(level, row, col) {
      var bounds = this.getTileBounds(level, row, col);      
      var extent = new Extent(bounds[0], bounds[1], bounds[2], bounds[3], SpatialReference.WebMercator);
      var quantizationParameters = {
        extent: extent,
        mode: "view",
        originPosition: "upper-left",
        tolerance: extent.width / (this.tileInfo.size[0] / this.brickSize)
      }
      var out = {
        features: [],
        objectIds: new Set()
      };

      return this._query(out, bounds, quantizationParameters)
        .then(function() {
          var width = this.tileInfo.size[0];
          var height = this.tileInfo.size[0];
          var canvas = document.createElement("canvas");
          var context = canvas.getContext("2d");

          canvas.width = width;
          canvas.height = height;

          var brickSize = this.brickSize;
          var numBlocks = width / brickSize;
          var features = out.features;

          var counts = new Array(numBlocks * numBlocks);
          var maxValue = 200;

          for (var i = 0; i < features.length; i++) {
            var row = features[i].geometry.y;
            var col = features[i].geometry.x;

            var index = row * numBlocks + col;

            if (!counts[index]) {
              counts[index] = 1;
            }
            else {
              counts[index]++;
            }
          
          }

          for (var j = 0; j < counts.length; j++) {
            if (counts[j]) {
              var row = (j / numBlocks) | 0;
              var col = j - row * numBlocks;

              context.fillStyle = "rgba(" + 0 + "," + 255 + "," + 0 + "," + counts[j] / maxValue + ")";
              context.fillRect(col * brickSize, row * brickSize, brickSize, brickSize);
            }
          }

          return canvas;
        }.bind(this));
    },

    _query: function(out, bounds, quantizationParameters) {
      var extent = new Extent(bounds[0], bounds[1], bounds[2], bounds[3], SpatialReference.WebMercator);
      var outFeatures = out.features;
      var outObjectIds = out.objectIds;
      var objectIdField = this.layer.objectIdField;

      var query = this.layer.createQuery().set({
        where: "1=1",
        geometry: extent,
        outFields: [objectIdField],
        quantizationParameters: quantizationParameters
      }).toJSON();
      query.f = "json";
      query.geometry = JSON.stringify(extent); // api bug probably

      return esriRequest(this.layer.parsedUrl.path + "/query", {
        responseType: "json",
        query: query
      })
      .then(function(response) {
        var features = response.data.features;

        for (var i = 0; i < features.length; i++) {
          var feature = features[i];
          var objectId = feature.attributes[objectIdField];

          if (!outObjectIds.has(objectId)) {
            outObjectIds.add(objectId);
            outFeatures.push(feature);
          }
        }

        if (response.data.exceededTransferLimit) {
          var w = (bounds[2] - bounds[0]) * 0.5;
          var h = (bounds[3] - bounds[1]) * 0.5;
          var topleft = [ bounds[0], bounds[1] + h, bounds[2] - w, bounds[3]];
          var topRight = [ bounds[0] + w, bounds[1] + h, bounds[2], bounds[3] ];
          var bottomleft = [ bounds[0], bounds[1], bounds[2] - w, bounds[3] - h ];
          var bottomRight = [ bounds[0] + w, bounds[1], bounds[2], bounds[3] - h ];

          return all([
            this._query(out, topleft, quantizationParameters),
            this._query(out, topRight, quantizationParameters),
            this._query(out, bottomleft, quantizationParameters),
            this._query(out, bottomRight, quantizationParameters)
          ]);
        }
      }.bind(this))
    }

  });

  return PointBinLayer;
});
