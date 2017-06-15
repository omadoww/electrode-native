// @flow

import fs from 'fs'
import path from 'path'

const ERN_RC_GLOBAL_FILE_PATH = path.join(`${process.env['HOME'] ? process.env['HOME'] : ''}/.ern`, '.ernrc')
const ERN_RC_LOCAL_FILE_PATH = path.join(process.cwd(), '.ernrc')

export class ErnConfig {
  get obj () : Object {
    return JSON.parse(fs.readFileSync(this.ernRcFilePath, 'utf-8'))
  }

  get ernRcFilePath () : string {
    return fs.existsSync(ERN_RC_LOCAL_FILE_PATH)
            ? ERN_RC_LOCAL_FILE_PATH
            : ERN_RC_GLOBAL_FILE_PATH
  }

  getValue (key: string, defaultValue: any) : any {
    return this.obj[key] || defaultValue
  }

  setValue (key: string, value: any) {
    let c = this.obj
    c[key] = value
    fs.writeFileSync(this.ernRcFilePath, JSON.stringify(c))
  }

  writeConfig (obj: Object) {
    fs.writeFileSync(this.ernRcFilePath, JSON.stringify(obj, null, 2))
  }
}
const config = new ErnConfig()

export default config
