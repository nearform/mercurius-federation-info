export function updateRequireField(type, value) {
  type.fields?.forEach(typeField => {
    const fieldFound = value.schema._typeMap[
      type.name
    ]?.extensionASTNodes[0]?.fields.find(f => typeField.name === f.name.value)
    const requireDirective = fieldFound?.directives?.find(
      directive => directive.name.value === 'requires'
    )
    if (requireDirective) {
      typeField.requires = requireDirective.arguments.map(arg => ({
        name: arg.kind.name,
        type: arg.value.kind,
        value: arg.value.value
      }))
    }
  })
}

export function updateExternalField(type, value) {
  type.fields?.forEach(typeField => {
    const fieldFound = value.schema._typeMap[
      type.name
    ]?.extensionASTNodes[0]?.fields.find(f => typeField.name === f.name.value)
    if (
      fieldFound?.directives?.find(
        directive => directive.name.value === 'external'
      )
    ) {
      typeField.isExternal = true
    }
  })
}

export function updateKeyDirective(type, value) {
  const key = value.schema._typeMap[
    type.name
  ]?.extensionASTNodes[0]?.directives?.find(
    directive => directive?.name?.value === 'key'
  )

  if (key) {
    type.key = key.arguments.map(arg => ({
      name: arg.kind.name,
      type: arg.value.kind,
      value: arg.value.value
    }))
  }
}
export function updateExtensionDirective(type, value) {
  if (
    value.schema._typeMap[type.name]?.extensionASTNodes[0]?.directives?.find(
      directive => directive?.name?.value === 'extends'
    )
  ) {
    type.isExtension = true
  }
}
