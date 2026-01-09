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
import { norm, up, zero } from "./../utils/utils"
import { R } from "../model/physics/constants"
import { Trace } from "./trace"

export class BallMesh {
  static ballModels: Map<number, Mesh> = new Map()
  static sharedGeometries: Map<number, any> = new Map()
  static sharedMaterials: Map<number, any> = new Map()
  mesh: Mesh
  shadow: Mesh
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

  updatePosition(pos) {
    this.mesh.position.copy(pos)
    this.shadow.position.copy(pos)
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

    const shadowGeometry = new CircleGeometry(R * 0.9, 9)
    shadowGeometry.applyMatrix4(
      new Matrix4().identity().makeTranslation(0, 0, -R * 0.99)
    )
    const shadowMaterial = new MeshBasicMaterial({ color: 0x111122 })
    this.shadow = new Mesh(shadowGeometry, shadowMaterial)
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
    scene.add(this.shadow)
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
}
