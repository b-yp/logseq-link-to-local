enum Type {
  Text = 'text',
  Mention = 'mention',
  Equation = 'equation',
}

export interface RichText {
  type?: Type
  [Type.Text]: {
    content: string
    link?: string | null
  }
}

export interface ImageLink {
  mdImage: string | null
  originalUrl: string | undefined
  url: string | undefined
  params: string | undefined
  fullName: string | undefined
  name: string
  type: string
  description: string
}
