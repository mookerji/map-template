import mapboxgl from 'mapbox-gl'
import React from 'react';
import PropTypes from 'prop-types';
import ky, { HTTPError } from 'ky';

export default class MapContainer extends React.PureComponent {
  constructor(props) {
    super(props);
    this.mapContainer = React.createRef();
  }

  static propTypes = {
    center: PropTypes.array.isRequired,
    zoom: PropTypes.number.isRequired,
    hasIsochrone: PropTypes.bool.isRequired,
    mapboxAccessToken: PropTypes.string,
    styleUrl: PropTypes.string.isRequired,
    mapContainerStyle: PropTypes.object,
    onMove: PropTypes.func
  }

  static defaultProps = {
    mapboxAccessToken: "pk.eyJ1IjoiZGFuc3dpY2siLCJhIjoiY2p4YW9ndzhpMHpmcjN5bnI5azI4NzkydiJ9.OM4ZKavMVW_vi4yd6iuG5A",
    mapContainerStyle: {
      position: 'relative',
      width: '100%',
      height: '100%'
    }
  }

  renderMap() {
    const { center, zoom, hasIsochrone, mapboxAccessToken, styleUrl } = this.props;
    mapboxgl.accessToken = mapboxAccessToken;
    
    this.map = new mapboxgl.Map({
      container: this.mapContainer.current, // this.ref.current instead of assigning ref via callback as in older examples
      style: styleUrl,
      center,
      zoom
    });

    const marker = new mapboxgl.Marker({
      'color': '#314ccd'
    });

    this.map.on('load', ()=> {
      // When the map loads, add the source and layer
      this.map.addSource('iso', {
        type: 'geojson',
        data: {
          "type": 'FeatureCollection',
          "features": []
        }
      });

      this.map.addLayer({
        'id': 'isoLayer',
        'type': 'fill',
        // Use "iso" as the data source for this layer
        'source': 'iso',
        'layout': {},
        'paint': {
          // The fill color for the layer is set to a light purple
          'fill-color': '#5a3fc0',
          'fill-opacity': 0.3
        }
      }, "poi-label");

      // Initialize the marker at the query coordinates
      marker.setLngLat(center).addTo(this.map);

      if(hasIsochrone) {
        this.addIso(center).then(res => {
          this.map.getSource('iso').setData(res)
        });
      }

    });

    this.map.on('moveend', e => {
      this.onMove();
    });
  }

  componentDidMount() {
    this.renderMap();
  }

  componentDidUpdate() {
    this.map.remove();
    this.renderMap();
  }

  componentWillUnmount() {
    this.map.remove();
  }

  onMove = e => {
    const center = this.map.getCenter();
    const zoom = this.map.getZoom();
    return this.props.onMove([center.lng.toFixed(5), center.lat.toFixed(5)], zoom.toFixed(1));
  }

  async addIso(center) {
    // Create variables to use in getIso()
    const urlBase = 'https://api.mapbox.com/isochrone/v1/mapbox/';
    const profile = 'walking';
    const minutes = 15;

    const query = `${urlBase}${profile}/${center}?contours_minutes=${minutes}&polygons=true&access_token=${this.props.mapboxAccessToken}`;

    const response = await fetch(query, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new HTTPError('Fetch error: ', response.statusText);
    }

    const parsed = await response.json();
    return parsed;
  }

  render() {
    return <div style={this.props.mapContainerStyle} ref={this.mapContainer}></div>
  }
}
