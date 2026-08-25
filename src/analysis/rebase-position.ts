import type { Node, Point, Position } from 'unist'
import type { SourcePoint, SourceRange } from './types.js'

export interface SourceLine {
  value: string
  start: SourcePoint
}

export function sourcePoint(point: Point | undefined): SourcePoint | undefined {
  if (!point || point.offset === undefined) return undefined
  return {
    line: point.line,
    column: point.column,
    offset: point.offset,
  }
}

export function sourceRange(
  position: Position | null | undefined,
): SourceRange | undefined {
  const start = sourcePoint(position?.start)
  const end = sourcePoint(position?.end)
  return start && end ? { start, end } : undefined
}

export function advancePoint(point: SourcePoint, value: string): SourcePoint {
  let { line, column, offset } = point
  for (let index = 0; index < value.length; index++) {
    const character = value[index]
    offset++
    if (character === '\r' && value[index + 1] === '\n') {
      offset++
      index++
      line++
      column = 1
    } else if (character === '\n' || character === '\r') {
      line++
      column = 1
    } else {
      column++
    }
  }
  return { line, column, offset }
}

export function rebaseTreePositions(node: Node, lines: SourceLine[]): void {
  rebaseNode(node as Node & Record<string, unknown>, lines)
}

function rebaseNode(
  node: Node & Record<string, unknown>,
  lines: SourceLine[],
): void {
  if (node.position) node.position = rebasePosition(node.position, lines)
  rebasePrivatePoints(node, lines)

  const children = node.children
  if (Array.isArray(children)) {
    for (const child of children) {
      rebaseNode(child as Node & Record<string, unknown>, lines)
    }
  }
}

function rebasePosition(position: Position, lines: SourceLine[]): Position {
  return {
    start: rebasePoint(position.start, lines),
    end: rebasePoint(position.end, lines),
  }
}

function rebasePoint(point: Point, lines: SourceLine[]): Point {
  const line = lines[point.line - 1]
  if (!line || point.offset === undefined) return point
  return {
    line: line.start.line,
    column: line.start.column + point.column - 1,
    offset: line.start.offset + point.column - 1,
  }
}

function rebasePrivatePoints(
  node: Record<string, unknown>,
  lines: SourceLine[],
): void {
  for (const key of ['_bodyLines', '_contentLines']) {
    const records = node[key]
    if (!Array.isArray(records)) continue
    for (const record of records) {
      if (isSourceLine(record)) {
        record.start = rebaseSourcePoint(record.start, lines)
      }
    }
  }

  const closeStart = node._closeStart
  if (isSourcePoint(closeStart)) {
    node._closeStart = rebaseSourcePoint(closeStart, lines)
  }
}

function rebaseSourcePoint(point: SourcePoint, lines: SourceLine[]): SourcePoint {
  const line = lines[point.line - 1]
  if (!line) return point
  return {
    line: line.start.line,
    column: line.start.column + point.column - 1,
    offset: line.start.offset + point.column - 1,
  }
}

function isSourceLine(value: unknown): value is SourceLine {
  return Boolean(
    value
      && typeof value === 'object'
      && 'value' in value
      && 'start' in value
      && isSourcePoint((value as SourceLine).start),
  )
}

function isSourcePoint(value: unknown): value is SourcePoint {
  return Boolean(
    value
      && typeof value === 'object'
      && typeof (value as SourcePoint).line === 'number'
      && typeof (value as SourcePoint).column === 'number'
      && typeof (value as SourcePoint).offset === 'number',
  )
}
