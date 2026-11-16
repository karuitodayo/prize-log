import L from "leaflet";

// Leafletの既定マーカー画像はバンドラー環境で読み込めないため、
// アプリの配色に合わせたシンプルなピンをDivIconとして自作する。
export function createPinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "map-pin-icon",
    html: `<span style="
      display:block;width:26px;height:26px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid #0f1115;box-shadow:0 1px 4px rgba(0,0,0,0.4);
    "></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

export const storePinIcon = createPinIcon("#57c7ff");
export const pickerPinIcon = createPinIcon("#ffd54a");
