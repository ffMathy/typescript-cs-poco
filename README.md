# typescript-cs-poco
[![Build Status](https://travis-ci.org/ffMathy/typescript-cs-poco.svg?branch=master)](https://travis-ci.org/Evertras/typescript-cs-poco)

Generates a Typescript type definition file for a C# POCO class.  Takes in a string of the file contents and spits back a string of the matching Typescript interface.

## Current wrappers

- Gulp: https://github.com/ffMathy/gulp-typescript-cs-poco
- Grunt: https://github.com/ffMathy/grunt-typescript-cs-poco

## Installation with npm

`npm install --save https://github.com/ffMathy/typescript-cs-poco.git`

## Options

The following options can be supplied into the `pocoGen` function, and are therefore also available in the above wrappers.

##### baseNamespace

If supplied, wraps all classes into a module with the same name.  Example:

```C#
public class MyPoco
{
	public string Name { get; set; }
	public int Id { get; set; }
}
```

```typescript
module MyNamespace {
	export interface IMyPoco {
		Name: string;
		Id: number;
	}
}
```

Note that using this option with gulp concat() will create many individual module/interface declarations.  This is technically valid, but if you want a nice, clean version run concat() first on all your .cs files and then run this plugin with the baseNamespace option to wrap EVERYthing in a single module namespace.

##### dateTimeToDate

Defaults to `false`.  Due to serialization/deserialization complications, the default implementation is to transform DateTime fields to strings, as that's what they naturally turn into in most .NET APIs.  If you want to treat the type as a Date, *first make sure your API is handling the serialization properly*!  Then provide the dateTimeToDate option set to `true` to turn this:

```C#
public class MyPoco
{
  public DateTime Timestamp { get; set; }
  public double Value { get; set; }
}
```

Into this:

```typescript
interface IMyPoco {
  Timestamp: Date;
  Value: number;
}
```

##### definitionFile

Defaults to `true`.  If explicitly set to `false`, the output file will not be of type d.ts and any baseNamespace being used will not have declare before the module name.

##### propertyNameResolver

If supplied, this function will be called every time a property is resolved. The function takes a single parameter of the name of the property and should return the transformed name as a string.  For example, the function might turn the property name into camelCase, or prepend it with a prefix of some sort to help match an API-side transformation.

The following example shows how to turn property names into camelCase.

```typescript
function camelCasePropertyNameResolver(propName) { 
  return propName[0].toLowerCase() + propName.substring(1); 
}
```

##### timeout

Specifies the regex timeout, in milliseconds. Defaults to `30000`. Useful if you are performing operations on large items.

##### prefixWithI

Defaults to `false`. If set to `true`, all interfaces (but not enums) will be prefixed with I. The conversion will now look like this:

```C#
public class MyPoco
{
  public string Name { get; set; }
  public int Id { get; set; }
}
```

To:

```typescript
interface IMyPoco {
  Name: string;
  Id: number;
}
```

##### additionalInterfaceCodeResolver

If supplied, this function will be called for every interface generated. The function takes a single parameter of the name of the class or interface that the current interface is being generated from and should return additional code that will be added to the interface.

The following example shows how to add a `clone` method to all interfaces generated which returns a type of the original class.

```typescript
function cloneFunctionInterfaceCodeResolver(leadingWhitespace, className, properties, methods) { 
  return leadingWhitespace + "clone(newId: number): " + className + ";"; 
}
```

##### methodNameResolver

Same as `propertyNameResolver`, but for method names.

##### interfaceNameResolver

Same as `propertyNameResolver`, but for interface names.

##### typeResolver

Same as `propertyNameResolver`, but has a `scope` parameter as well, and is meant for type names instead. The `scope` can be either `"property-type"`, `"method-return-type"` or `"method-argument-type"` depending on what context the current type was found.

For instance, the following example will wrap all types emitted in an `Observable<>`, but only for properties.

```typescript
function camelCasePropertyTypeResolver(typeName, scope) { 
  if(scope !== "property-type") return typeName;
  return "Observable<" + typeName + ">"; 
}
```

##### ignoreVirtual

If set to `true`, virtual properties will be ignored.  This is useful for things like EF-created POCOs that may have virtual reference fields that shouldn't be included.

##### ignoreMethods

If set to `true`, methods will be ignored.

##### stripReadOnly

If set to `true`, the `readonly` keyword on properties will be removed, but the properties themselves will still be added.

##### includeInterfaces

If set to `true`, any interfaces found in the given files will also be included as Typescript interfaces.  By default interfaces are ignored.

##### ignoreInheritance

If set to an array of class names, inheritance from these classes will be ignored. If set to `true` will ignore inheritance in general.

##### useStringUnionTypes

If set to `true`, any enums will be converted to string union types.

##### customTypeTranslations

If set to an object, map every key in the object to the key's value.  For example:

```typescript
var options = {
  customTypeTranslations: {
    MyCustomStringClass: 'string'
  }
}
```

Will turn this:

```C#
public class MyPoco
{
  public MyCustomStringClass Name { get; set; }
}
```

Into this:

```typescript
interface MyPoco {
  Name: string;
}
```
