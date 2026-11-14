// Finds what can be cut out of each book cover, using Apple's Vision framework
// (macOS 14 or later). For every image in src/assets/bookcovers it writes:
//   - scripts/collage/masks/<cover>__<n>.png  one mask per subject Vision can
//     lift from the cover (a person, a figure, an object), cut along its outline
//   - scripts/collage/detect.json             faces, people and lines of text,
//     as boxes in 0..1 coordinates with the origin at the top left
// Run: swift scripts/collage/extract.swift
import Foundation
import Vision
import CoreImage
import AppKit

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let src = root.appendingPathComponent("src/assets/bookcovers")
let outDir = root.appendingPathComponent("scripts/collage")
let maskDir = outDir.appendingPathComponent("masks")
try? FileManager.default.createDirectory(at: maskDir, withIntermediateDirectories: true)
let ctx = CIContext()

func box(_ r: CGRect) -> [Double] { // Vision's origin is bottom left; flip it
  [Double(r.minX), Double(1 - r.maxY), Double(r.width), Double(r.height)]
}

var all: [String: Any] = [:]
let files = try FileManager.default.contentsOfDirectory(atPath: src.path).sorted()
for name in files {
  let url = src.appendingPathComponent(name)
  guard let ci = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]),
        let cg = ctx.createCGImage(ci, from: ci.extent) else { continue }
  let handler = VNImageRequestHandler(cgImage: cg, options: [:])
  let faces = VNDetectFaceRectanglesRequest()
  let humans = VNDetectHumanRectanglesRequest(); humans.upperBodyOnly = true
  let text = VNRecognizeTextRequest(); text.recognitionLevel = .accurate; text.usesLanguageCorrection = false
  let lift = VNGenerateForegroundInstanceMaskRequest()
  try? handler.perform([faces, humans, text, lift])

  var entry: [String: Any] = ["w": cg.width, "h": cg.height]
  entry["faces"] = (faces.results ?? []).map { box($0.boundingBox) }
  entry["humans"] = (humans.results ?? []).map { box($0.boundingBox) }
  entry["text"] = (text.results ?? []).compactMap { o -> [String: Any]? in
    guard let top = o.topCandidates(1).first else { return nil }
    return ["s": top.string, "c": Double(top.confidence), "b": box(o.boundingBox)]
  }
  var masks: [[String: Any]] = []
  if let obs = lift.results?.first {
    for idx in obs.allInstances {
      guard let buf = try? obs.generateScaledMaskForImage(forInstances: IndexSet(integer: idx), from: handler) else { continue }
      let m = CIImage(cvPixelBuffer: buf)
      // Keep masks small: the renderer scales them back up over the cover
      let scale = min(1, 420 / max(m.extent.width, m.extent.height))
      let small = m.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
      guard let out = ctx.createCGImage(small, from: small.extent, format: .L8, colorSpace: CGColorSpaceCreateDeviceGray()) else { continue }
      let rep = NSBitmapImageRep(cgImage: out)
      guard let png = rep.representation(using: .png, properties: [:]) else { continue }
      let file = "\(name)__\(idx).png"
      try? png.write(to: maskDir.appendingPathComponent(file))
      masks.append(["file": file])
    }
  }
  entry["masks"] = masks
  all[name] = entry
}
let data = try JSONSerialization.data(withJSONObject: all, options: [.sortedKeys])
try data.write(to: outDir.appendingPathComponent("detect.json"))
print("\(all.count) covers")
