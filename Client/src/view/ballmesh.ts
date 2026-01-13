import {
  IcosahedronGeometry,
  Matrix4,
  Mesh,
  MeshPhongMaterial,
  CircleGeometry,
  MeshBasicMaterial,
  ArrowHelper,
  Color,
  BufferAttribute,
  Vector3,
} from "three"
import { State } from "../model/ball"
import { norm, up, zero } from "../utils/utils"
import { R } from "../model/physics/constants"
import { Trace } from "./trace"

export class BallMesh {
  static ballModels: Map<number, Mesh> = new Map()
  static sharedGeometries: Map<number, any> = new Map()
  static sharedMaterials: Map<number, any> = new Map()
  // Multiplayer mode - skip shadow rendering for performance
  static isMultiplayer: boolean = false
  mesh: Mesh
  shadow: Mesh | null = null
  spinAxisArrow: ArrowHelper
  trace: Trace
  color: Color
  isStripe: boolean
  ballNumber: number | undefined
  constructor(color, isStripe = false, ballNumber?: number) {
    this.color = new Color(color)
    this.isStripe = isStripe
    this.ballNumber = ballNumber
    this.initialiseMesh(color)
  }

  updateAll(ball, t) {
    this.updatePosition(ball.pos)
    this.updateArrows(ball.pos, ball.rvel, ball.state)
    if (ball.rvel.lengthSq() !== 0) {
      this.updateRotation(ball.rvel, t)
      this.trace.addTrace(ball.pos, ball.vel)
    }
  }

  // light direction used to project the shadow onto the table (small horizontal offset)
  readonly shadowLightDir = new Vector3(-0.4, -0.6, -1).normalize()
  readonly shadowOffset = new Vector3()

  updatePosition(pos) {
    // Move the ball
    this.mesh.position.copy(pos)

    // Skip shadow updates in multiplayer mode
    if (!this.shadow) return

    // Project shadow onto table surface (z=0). Avoid following the ball's z directly.
    // Compute 2D offset from ball height using a fixed light direction so the shadow
    // subtly shifts away from the ball when the ball is lifted.
    const height = Math.max(0, pos.z)
    const offsetScale = 0.6 // how strongly height affects the shadow offset
    this.shadowOffset.set(
      this.shadowLightDir.x * height * offsetScale,
      this.shadowLightDir.y * height * offsetScale,
      0
    )

    // Place shadow at table surface (slightly above z=0 to avoid z-fighting with table cloth)
    this.shadow.position.set(pos.x + this.shadowOffset.x, pos.y + this.shadowOffset.y, 0.001)

    // Scale shadow based on ball height (higher ball = smaller shadow)
    const minScale = 0.4
    const maxScale = 1.0
    const scale = Math.max(minScale, Math.min(maxScale, 1 - height / (R * 2)))
    this.shadow.scale.set(scale, scale, 1)
  }

  readonly m = new Matrix4()

  updateRotation(rvel, t) {
    const angle = rvel.length() * t
    this.mesh.rotateOnWorldAxis(norm(rvel), angle)
  }

  updateArrows(pos, rvel, state) {
    this.spinAxisArrow.setLength(R + (R * rvel.length()) / 2, R, R)
    this.spinAxisArrow.position.copy(pos)
    this.spinAxisArrow.setDirection(norm(rvel))
    if (state == State.Rolling) {
      this.spinAxisArrow.setColor(0xcc0000)
    } else {
      this.spinAxisArrow.setColor(0x00cc00)
    }
  }

  initialiseMesh(color) {
    // Use loaded GLB model if available for this ball number
    if (this.ballNumber !== undefined && BallMesh.ballModels.has(this.ballNumber)) {
      const modelMesh = BallMesh.ballModels.get(this.ballNumber)!
      
      // Reuse geometry and material instead of cloning entire mesh
      if (!BallMesh.sharedGeometries.has(this.ballNumber)) {
        BallMesh.sharedGeometries.set(this.ballNumber, modelMesh.geometry)
        BallMesh.sharedMaterials.set(this.ballNumber, modelMesh.material)
      }
      
      const geometry = BallMesh.sharedGeometries.get(this.ballNumber)
      const material = BallMesh.sharedMaterials.get(this.ballNumber)
      
      this.mesh = new Mesh(geometry, material)
      this.mesh.name = "ball"
      this.mesh.scale.set(R * 1, R * 1, R * 1) // Scale to match physics radius
    } else {
      // Fall back to generated geometry for cue ball or if model not loaded
      const geometry = new IcosahedronGeometry(R, 1)
      const material = new MeshPhongMaterial({
        emissive: 0,
        flatShading: true,
        vertexColors: true,
        forceSinglePass: true,
        shininess: 25,
        specular: 0x555533,
      })
      this.addDots(geometry, color)
      this.mesh = new Mesh(geometry, material)
      this.mesh.name = "ball"
    }
    this.updateRotation(new Vector3().random(), 100)

    // Skip shadow creation in multiplayer mode for performance
    if (!BallMesh.isMultiplayer) {
      const shadowGeometry = new CircleGeometry(R * 0.9, 9)
      // Shadow lies in the XY plane at z=0 (table surface), no rotation needed
      const shadowMaterial = new MeshBasicMaterial({ color: 0x111122, transparent: true, opacity: 0.5 })
      this.shadow = new Mesh(shadowGeometry, shadowMaterial)
    }
    this.spinAxisArrow = new ArrowHelper(up, zero, 2, 0x000000, 0.01, 0.01)
    this.spinAxisArrow.visible = false
    this.trace = new Trace(500, color)
  }

  addDots(geometry, baseColor) {
    const count = geometry.attributes.position.count
    const color = new Color(baseColor)
    const white = new Color(0xFFFFFF)
    const red = new Color(0xaa2222)
    const black = new Color(0x000000)

    geometry.setAttribute(
      "color",
      new BufferAttribute(new Float32Array(count * 3), 3)
    )

    const verticies = geometry.attributes.color
    const positions = geometry.attributes.position
    
    for (let i = 0; i < count / 3; i++) {
      // Get the center position of this face
      const v1 = new Vector3(
        positions.getX(i * 3),
        positions.getY(i * 3),
        positions.getZ(i * 3)
      )
      const v2 = new Vector3(
        positions.getX(i * 3 + 1),
        positions.getY(i * 3 + 1),
        positions.getZ(i * 3 + 1)
      )
      const v3 = new Vector3(
        positions.getX(i * 3 + 2),
        positions.getY(i * 3 + 2),
        positions.getZ(i * 3 + 2)
      )
      const center = new Vector3().addVectors(v1, v2).add(v3).divideScalar(3)
      
      if (this.isStripe) {
        // For stripes: color the top half, white the bottom half
        // Use z-coordinate to determine stripe boundary
        if (center.z > -R * 0.3 && center.z < R * 0.3) {
          // Middle stripe band - use base color
          this.colorVerticesForFace(
            i,
            verticies,
            this.scaleNoise(color.r),
            this.scaleNoise(color.g),
            this.scaleNoise(color.b)
          )
        } else {
          // Top and bottom - white
          this.colorVerticesForFace(i, verticies, white.r, white.g, white.b)
        }
      } else {
        // Solid ball - all same color
        this.colorVerticesForFace(
          i,
          verticies,
          this.scaleNoise(color.r),
          this.scaleNoise(color.g),
          this.scaleNoise(color.b)
        )
      }
    }

    // Add number dots/markers for ball identification
    if (this.ballNumber !== undefined && this.ballNumber > 0 && this.ballNumber !== 8) {
      // Add contrasting dots to represent the ball number for other balls
      // Skip 8-ball - it should be fully black with no dots
      const dots = [0, 96, 111, 156, 186, 195].slice(0, Math.min(this.ballNumber, 6))
      const dotColor = this.isStripe || baseColor === 0xFFD700 ? black : red
      dots.forEach((i) => {
        this.colorVerticesForFace(i / 3, verticies, dotColor.r, dotColor.g, dotColor.b)
      })
    }
  }

  addToScene(scene) {
    scene.add(this.mesh)
    if (this.shadow) {
      scene.add(this.shadow)
    }
    scene.add(this.spinAxisArrow)
    scene.add(this.trace.line)
  }

  private colorVerticesForFace(face, verticies, r, g, b) {
    verticies.setXYZ(face * 3 + 0, r, g, b)
    verticies.setXYZ(face * 3 + 1, r, g, b)
    verticies.setXYZ(face * 3 + 2, r, g, b)
  }

  private scaleNoise(v) {
    return (1.0 - Math.random() * 0.25) * v
  }

  /**
   * Update the ball number (used when server sends randomized rack).
   * This will update the mesh to show the correct ball model/color.
   */
  setBallNumber(ballNumber: number) {
    if (this.ballNumber === ballNumber) return  // No change needed
    
    this.ballNumber = ballNumber
    this.isStripe = ballNumber > 8
    
    // Get color from ball number
    const colorMap: Record<number, number> = {
      0: 0xfaebd7,  // cue ball
      1: 0xffcc00,  // yellow
      2: 0x0000ff,  // blue
      3: 0xff0000,  // red
      4: 0x800080,  // purple
      5: 0xff4500,  // orange
      6: 0x008000,  // green
      7: 0x8b0000,  // maroon/burgundy
      8: 0x000000,  // black (8-ball)
      9: 0xffcc00,  // yellow stripe
      10: 0x0000ff, // blue stripe
      11: 0xff0000, // red stripe
      12: 0x800080, // purple stripe
      13: 0xff4500, // orange stripe
      14: 0x008000, // green stripe
      15: 0x8b0000, // maroon stripe
    }
    
    this.color = new Color(colorMap[ballNumber] ?? 0xeeeeee)
    
    // Store current position and parent scene
    const currentPosition = this.mesh.position.clone()
    const parentScene = this.mesh.parent
    
    // Remove old mesh from scene
    if (parentScene) {
      parentScene.remove(this.mesh)
    }
    
    // Reinitialize with new ball number
    this.initialiseMesh(this.color.getHex())
    
    // Restore position
    this.mesh.position.copy(currentPosition)
    
    // Add back to scene
    if (parentScene) {
      parentScene.add(this.mesh)
    }
  }
}
