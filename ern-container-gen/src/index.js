// @flow

import { generateMiniAppsComposite as _generateMiniAppsComposite } from './utils'
import _generateContainer from './generateContainer'
import _IosGenerator from './generators/ios/IosGenerator'
import _AndroidGenerator from './generators/android/AndroidGenerator'
import _Publisher from './Publisher'
import _ContainerGeneratorConfig from './ContainerGeneratorConfig'

export const AndroidGenerator = _AndroidGenerator
export const IosGenerator = _IosGenerator
export const generateContainer = _generateContainer
export const generateMiniAppsComposite = _generateMiniAppsComposite
export const Publisher = _Publisher
export const ContainerGeneratorConfig = _ContainerGeneratorConfig

export default ({
  AndroidGenerator: _AndroidGenerator,
  IosGenerator: _IosGenerator,
  generateContainer: _generateContainer,
  generateMiniAppsComposite: _generateMiniAppsComposite,
  Publisher: _Publisher,
  ContainerGeneratorConfig: _ContainerGeneratorConfig
})
