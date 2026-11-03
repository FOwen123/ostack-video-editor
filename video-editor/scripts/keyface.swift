// Cut the speaker out of a face-cam clip and put them over a still background
// (a "green screen" without a green screen), using macOS Vision person segmentation.
//
//     swiftc -O keyface.swift -o /tmp/keyface && /tmp/keyface <in.mov> <background.png> <out.mov>
//
// Writes video only (HEVC, same size and frame rate); mux the cleaned audio with ffmpeg.
import AVFoundation
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 4 else { print("usage: keyface <in.mov> <background.png> <out.mov>"); exit(1) }
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let track = asset.tracks(withMediaType: .video)[0]
let size = track.naturalSize
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(out)

let outURL = URL(fileURLWithPath: args[3])
try? FileManager.default.removeItem(at: outURL)
let writer = try! AVAssetWriter(outputURL: outURL, fileType: .mov)
let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.hevc, AVVideoWidthKey: size.width, AVVideoHeightKey: size.height,
    AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 20_000_000],
])
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: size.width, kCVPixelBufferHeightKey as String: size.height,
])
writer.add(input)
reader.startReading()
writer.startWriting()
writer.startSession(atSourceTime: .zero)

let ctx = CIContext()
var bg = CIImage(contentsOf: URL(fileURLWithPath: args[2]))!
bg = bg.transformed(by: CGAffineTransform(scaleX: size.width / bg.extent.width, y: size.height / bg.extent.height))
let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
var prevMask: CIImage?
var maskBufs: [CVPixelBuffer] = []  // two, alternating: never render into the buffer being read
var n = 0

// autoreleasepool per frame: without it every decoded 4K frame stays alive until exit (~40 GB per take).
while let sample = out.copyNextSampleBuffer() { autoreleasepool {
    let pts = CMSampleBufferGetPresentationTimeStamp(sample)
    let frame = CMSampleBufferGetImageBuffer(sample)!
    try! VNImageRequestHandler(cvPixelBuffer: frame).perform([request])
    let raw = CIImage(cvPixelBuffer: request.results![0].pixelBuffer)
    var blended = raw
    if let p = prevMask {  // blend with the last frame's mask: the edge would otherwise shimmer
        blended = raw.applyingFilter("CIDissolveTransition", parameters: ["inputTargetImage": p, "inputTime": 0.35])
    }
    // Render the blend, so the next frame mixes with pixels, not a recipe that holds every past mask.
    if maskBufs.isEmpty {
        for _ in 0..<2 {
            var b: CVPixelBuffer?
            CVPixelBufferCreate(nil, Int(raw.extent.width), Int(raw.extent.height), kCVPixelFormatType_OneComponent8,
                                [kCVPixelBufferIOSurfacePropertiesKey: [:]] as CFDictionary, &b)
            maskBufs.append(b!)
        }
    }
    let dst = maskBufs[n % 2]
    ctx.render(blended, to: dst, bounds: raw.extent, colorSpace: nil)
    prevMask = CIImage(cvPixelBuffer: dst, options: [.colorSpace: NSNull()])
    var mask = prevMask!.transformed(by: CGAffineTransform(scaleX: size.width / raw.extent.width, y: size.height / raw.extent.height))
    // Pull the edge in and soften it: the white wall otherwise rims the hair and shoulders.
    mask = mask.applyingFilter("CIMorphologyMinimum", parameters: ["inputRadius": 8])
        .applyingFilter("CIGaussianBlur", parameters: ["inputRadius": 3]).cropped(to: CGRect(origin: .zero, size: size))
    let person = CIImage(cvPixelBuffer: frame)
    let comp = person.applyingFilter("CIBlendWithMask", parameters: ["inputBackgroundImage": bg, "inputMaskImage": mask])
    while !input.isReadyForMoreMediaData { usleep(2000) }
    var buf: CVPixelBuffer?
    CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buf)
    ctx.render(comp, to: buf!)
    adaptor.append(buf!, withPresentationTime: pts)
    n += 1
}}
input.markAsFinished()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print("\(n) frames -> \(args[3]) (\(writer.status == .completed ? "ok" : "FAILED: \(String(describing: writer.error))"))")
