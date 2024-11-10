const countiesLayerUrl = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USA_Census_Counties/FeatureServer/0";
const camerasLayerUrl = "https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0";

require([
    "esri/Map",
    "esri/views/MapView",
    "esri/layers/FeatureLayer",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/renderers/SimpleRenderer",
    "esri/geometry/Extent",
    "esri/widgets/Legend",
    "esri/renderers/ClassBreaksRenderer",
    "esri/symbols/SimpleFillSymbol"
], function (Map, MapView, FeatureLayer, SimpleMarkerSymbol, SimpleRenderer, Extent, Legend, ClassBreaksRenderer, SimpleFillSymbol) {

    const map = new Map({ basemap: "gray-vector" });
    const view = new MapView({
        container: "viewDiv",
        map: map,
        extent: new Extent({
            xmin: -8845727.2636,
            ymin: 4588514.9294,
            xmax: -8356547.7875,
            ymax: 4825010.8515,
            spatialReference: { wkid: 102100 }
        })
    });

    const camerasLayer = new FeatureLayer({
        url: camerasLayerUrl,
        outFields: ["county", "location", "url"],
        popupTemplate: {
            title: "📍 Câmera de Tráfego",
            content: (feature) => {
                const { location, url } = feature.graphic.attributes;
                const { x, y } = feature.graphic.geometry;
                return `
                    <div style="font-size: 14px;">
                        <strong>Localização:</strong> ${location}<br>
                        <strong>Latitude:</strong> ${y.toFixed(5)}<br>
                        <strong>Longitude:</strong> ${x.toFixed(5)}<br>
                        <strong>Link:</strong> <a href="${url}" target="_blank" style="color: #0073e6;">Visualizar detalhes</a>
                    </div>
                `;
            }
        },
        renderer: new SimpleRenderer({
            symbol: new SimpleMarkerSymbol({
                style: "circle",
                color: "#4285F4",
                size: "10px",
                outline: { width: 1, color: "white" }
            })
        })
    });

    map.add(camerasLayer);

    const countiesLayer = new FeatureLayer({
        url: countiesLayerUrl,
        outFields: ["OBJECTID", "NAME", "STATE_NAME"],
        popupTemplate: {
            title: "Condado: {NAME}",
            content: "Estado: {STATE_NAME}<br>Contagem de câmeras: {camera_count}"
        }
    });

    map.add(countiesLayer);

    const cameraCounts = {};

    function updateCameraCounts() {
        const url = `https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/Traffic_Cameras/FeatureServer/0/query?where=1=1&outFields=county&outStatistics=[{"statisticType":"count","onStatisticField":"county","outStatisticFieldName":"camera_count"}]&groupByFieldsForStatistics=county&f=json`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                data.features.forEach(feature => {
                    const countyName = feature.attributes.county;
                    const cameraCount = feature.attributes.camera_count;
                    cameraCounts[countyName] = cameraCount;
                });
                applyChoroplethRenderer();
            })
            .catch(error => {
                console.error("Erro ao calcular contagens de câmeras:", error);
            });
    }

    function applyChoroplethRenderer() {
        const renderer = new ClassBreaksRenderer({
            valueExpression: `
                var countyName = $feature.NAME;
                var cameraCount = ${JSON.stringify(cameraCounts)};
                return countyName in cameraCount ? cameraCount[countyName] : 0;
            `,
            classBreakInfos: [
                {
                    minValue: 0,
                    maxValue: 0,
                    symbol: new SimpleFillSymbol({
                        color: "lightgrey",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "0 câmeras"
                },
                {
                    minValue: 1,
                    maxValue: 10,
                    symbol: new SimpleFillSymbol({
                        color: "#e0f2e9",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "1 - 10 câmeras"
                },
                {
                    minValue: 11,
                    maxValue: 20,
                    symbol: new SimpleFillSymbol({
                        color: "#a8dbc9",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "11 - 20 câmeras"
                },
                {
                    minValue: 21,
                    maxValue: 30,
                    symbol: new SimpleFillSymbol({
                        color: "#70c4aa",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "21 - 30 câmeras"
                },
                {
                    minValue: 31,
                    maxValue: 40,
                    symbol: new SimpleFillSymbol({
                        color: "#38ad8a",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "31 - 40 câmeras"
                },
                {
                    minValue: 41,
                    maxValue: 50,
                    symbol: new SimpleFillSymbol({
                        color: "#008f6a",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "41 - 50 câmeras"
                },
                {
                    minValue: 51,
                    maxValue: Infinity,
                    symbol: new SimpleFillSymbol({
                        color: "#006d2c",
                        outline: { color: "white", width: 0.5 }
                    }),
                    label: "50+ câmeras"
                }
            ]
        });

        countiesLayer.renderer = renderer;

        countiesLayer.popupTemplate.content = (feature) => {
            const countyName = feature.graphic.attributes.NAME;
            const countyCount = cameraCounts[countyName] || 0;
            return `Condado: ${countyName}<br>Contagem de câmeras: ${countyCount}`;
        };
    }

    const legend = new Legend({
        view: view,
        layerInfos: [{ layer: countiesLayer, title: "Contagem de Câmeras por Condado" }]
    });
    view.ui.add(legend, "bottom-right");

    document.getElementById("styleSwitch").addEventListener("click", () => {
        map.basemap = map.basemap.id === "gray-vector" ? "streets" : "gray-vector";
    });

    countiesLayer.when(updateCameraCounts);
    loadCameraOptions();
});
