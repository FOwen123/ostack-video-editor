// Face position over time in a video, for zoom.py's head-follow camera (macOS Vision).
//
//   swift facetrack.swift <video> <samples-per-second> > track.json
//
// Prints [[seconds, cx, cy, h], ...]: the largest face's centre and height as fractions of the
// frame, top-left origin. Samples with no face are left out.
import AVFoundation
import Vision

let args = CommandLine.arguments
guard args.count == 3, let rate = Double(args[2]) else {
  FileHandle.standardError.write("usage: swift facetrack.swift <video> <samples-per-second>\n".data(using: .utf8)!)
  exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero
gen.maximumSize = CGSize(width: 540, height: 960)
let duration = CMTimeGetSeconds(asset.duration)
var out: [[Double]] = []
var t = 0.0
while t < duration {
  if let img = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) {
    let req = VNDetectFaceRectanglesRequest()
    try? VNImageRequestHandler(cgImage: img).perform([req])
    if let f = (req.results ?? []).max(by: { $0.boundingBox.height < $1.boundingBox.height }) {
      let b = f.boundingBox
      out.append([(t * 1000).rounded() / 1000, Double(b.midX), Double(1 - b.midY), Double(b.height)])
    }
  }
  t += 1 / rate
}
print(String(data: try! JSONSerialization.data(withJSONObject: out), encoding: .utf8)!)
