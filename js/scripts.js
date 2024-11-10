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
        }),
        popup: {
            autoOpenEnabled: true // Enable popup auto-open on click
        }
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
            content: (feature) => {
                const countyName = feature.graphic.attributes.NAME;
                const countyCount = cameraCounts[countyName] || 0;
                const colorInfo = getColorAndLabelForCount(countyCount);

                return `
                    <div style="font-size: 14px;">
                        <strong>Condado:</strong> ${countyName}<br>
                        <strong>Estado:</strong> ${feature.graphic.attributes.STATE_NAME}<br>
                        <strong>Contagem de Câmeras:</strong> ${countyCount}<br>
                        <div style="display: flex; align-items: center; margin-top: 8px;">
                            <div style="width: 20px; height: 20px; background-color: ${colorInfo.color}; margin-right: 8px;"></div>
                            <span>${colorInfo.label}</span>
                        </div>
                    </div>
                `;
            }
        },
        selectionSymbol: new SimpleFillSymbol({
            color: [255, 215, 0, 0.4],
            outline: { color: [255, 69, 0, 1], width: 2 }
        })
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

    function getColorAndLabelForCount(count) {
        if (count === 0) return { color: "lightgrey", label: "0 câmeras" };
        if (count <= 10) return { color: "#e0f2e9", label: "1 - 10 câmeras" };
        if (count <= 20) return { color: "#a8dbc9", label: "11 - 20 câmeras" };
        if (count <= 30) return { color: "#70c4aa", label: "21 - 30 câmeras" };
        if (count <= 40) return { color: "#38ad8a", label: "31 - 40 câmeras" };
        if (count <= 50) return { color: "#008f6a", label: "41 - 50 câmeras" };
        return { color: "#006d2c", label: "50+ câmeras" };
    }

    function applyChoroplethRenderer() {
        const renderer = new ClassBreaksRenderer({
            valueExpression: `
                var countyName = $feature.NAME;
                var cameraCount = ${JSON.stringify(cameraCounts)};
                return countyName in cameraCount ? cameraCount[countyName] : 0;
            `,
            classBreakInfos: [
                { minValue: 0, maxValue: 0, symbol: new SimpleFillSymbol({ color: "lightgrey", outline: { color: "white", width: 0.5 } }), label: "0 câmeras" },
                { minValue: 1, maxValue: 10, symbol: new SimpleFillSymbol({ color: "#e0f2e9", outline: { color: "white", width: 0.5 } }), label: "1 - 10 câmeras" },
                { minValue: 11, maxValue: 20, symbol: new SimpleFillSymbol({ color: "#a8dbc9", outline: { color: "white", width: 0.5 } }), label: "11 - 20 câmeras" },
                { minValue: 21, maxValue: 30, symbol: new SimpleFillSymbol({ color: "#70c4aa", outline: { color: "white", width: 0.5 } }), label: "21 - 30 câmeras" },
                { minValue: 31, maxValue: 40, symbol: new SimpleFillSymbol({ color: "#38ad8a", outline: { color: "white", width: 0.5 } }), label: "31 - 40 câmeras" },
                { minValue: 41, maxValue: 50, symbol: new SimpleFillSymbol({ color: "#008f6a", outline: { color: "white", width: 0.5 } }), label: "41 - 50 câmeras" },
                { minValue: 51, maxValue: Infinity, symbol: new SimpleFillSymbol({ color: "#006d2c", outline: { color: "white", width: 0.5 } }), label: "50+ câmeras" }
            ]
        });

        countiesLayer.renderer = renderer;
    }

    const legend = new Legend({
        view: view,
        layerInfos: [{ layer: countiesLayer, title: "Contagem de Câmeras por Condado" }]
    });
    view.ui.add(legend, "bottom-right");

    document.getElementById("styleSwitch").addEventListener("click", () => {
        map.basemap = map.basemap.id === "gray-vector" ? "streets" : "gray-vector";
    });

    function loadCameraOptions() {
        camerasLayer.queryFeatures({
            where: "1=1",
            outFields: ["location", "url"],
            returnGeometry: true
        }).then(result => {
            const cameraSelect = document.getElementById("cameraSelect");
            result.features.forEach(feature => {
                const option = document.createElement("option");
                option.value = JSON.stringify(feature.geometry);
                option.textContent = feature.attributes.location;
                cameraSelect.appendChild(option);
            });

            cameraSelect.addEventListener("change", function () {
                const selectedGeometry = this.value ? JSON.parse(this.value) : null;
                if (selectedGeometry) {
                    view.goTo(selectedGeometry).then(() => {
                        view.popup.open({
                            title: "📍 Câmera de Tráfego",
                            location: selectedGeometry
                        });
                    });
                }
            });
        }).catch(error => console.error("Erro ao carregar opções de câmeras:", error));
    }

    countiesLayer.when(updateCameraCounts);
    loadCameraOptions();
});
