import * as L from 'leaflet';

declare module 'leaflet' {
  namespace Symbol {
    function arrowHead(options: {
      pixelSize: number;
      polygon?: boolean;
      pathOptions?: L.PathOptions;
    }): unknown;
  }

  function polylineDecorator(
    polyline: L.Polyline,
    options: { patterns: Array<{ offset: string | number; repeat: number; symbol: unknown }> }
  ): L.Layer;
}
