#!/usr/bin/env swift

// Generates the raster fallbacks required by iOS and older Android launchers.
// It uses macOS AppKit only at design time; the application has no runtime or
// build dependency on this script.

import AppKit
import Foundation

let fileManager = FileManager.default
let root = fileManager.currentDirectoryPath
let avatarPath = root + "/src/assets/marcia-avatar.png"
let outputDirectory = root + "/public/icons"

guard let avatar = NSImage(contentsOfFile: avatarPath) else {
  fputs("Avatar not found at \(avatarPath)\n", stderr)
  exit(1)
}

try fileManager.createDirectory(
  atPath: outputDirectory,
  withIntermediateDirectories: true,
  attributes: nil
)

func makeIcon(size: Int, filename: String) throws {
  let dimension = CGFloat(size)
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    throw NSError(domain: "MarciaPwaIcons", code: 1)
  }

  bitmap.size = NSSize(width: dimension, height: dimension)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)

  let canvas = NSRect(x: 0, y: 0, width: dimension, height: dimension)
  let background = NSGradient(
    colors: [
      NSColor(calibratedRed: 0.66, green: 0.42, blue: 1.0, alpha: 1),
      NSColor(calibratedRed: 0.42, green: 0.23, blue: 1.0, alpha: 1),
      NSColor(calibratedRed: 0.15, green: 0.08, blue: 0.31, alpha: 1),
    ]
  )!
  background.draw(in: canvas, angle: -55)

  NSColor.white.withAlphaComponent(0.08).setFill()
  let glow = NSRect(
    x: dimension * 0.68,
    y: dimension * 0.66,
    width: dimension * 0.42,
    height: dimension * 0.42
  )
  NSBezierPath(ovalIn: glow).fill()

  // The source is portrait. Use its upper square so the face and headset stay
  // readable even at home-screen icon sizes.
  let sourceSide = min(avatar.size.width, avatar.size.height)
  let source = NSRect(
    x: (avatar.size.width - sourceSide) / 2,
    y: avatar.size.height - sourceSide,
    width: sourceSide,
    height: sourceSide
  )
  avatar.draw(in: canvas, from: source, operation: .sourceOver, fraction: 1)

  NSGraphicsContext.restoreGraphicsState()

  guard let data = bitmap.representation(using: .png, properties: [.compressionFactor: 0.94]) else {
    throw NSError(domain: "MarciaPwaIcons", code: 2)
  }

  try data.write(to: URL(fileURLWithPath: outputDirectory + "/" + filename), options: .atomic)
}

try makeIcon(size: 192, filename: "marcia-192.png")
try makeIcon(size: 512, filename: "marcia-512.png")
try makeIcon(size: 180, filename: "apple-touch-icon.png")

print("PWA icons generated in public/icons")
