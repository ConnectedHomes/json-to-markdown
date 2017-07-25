"use strict";
var defined = require('./defined');
var defaultValue = require('./defaultValue');
var path = require('path');
var fs = require('fs');

module.exports = replaceRef;

/**
* @function replaceRef
* Replaces json schema file references referenced with a $ref property
* with the actual file content from the referenced schema file.
* @todo Does not currently support absolute reference paths, only relative paths.
* @param  {object} schema - The parsed json schema file as an object
* @param  {string} basePath - The root path where any relative schema file references can be resolved
* @param  {string[]} ignorableTypes - An array of schema filenames that shouldn't get their own documentation section.
* @param  {object} schemaReferences - An object that will be populated with all schemas referenced by this object
* @param  {string} parentTitle - A string that contains the title of the parent object
* @return {object} The schema object with all schema file referenced replaced with the actual file content.
*/
function replaceRef(schema, basePath, ignorableTypes, schemaReferences, parentTitle) {
    schemaReferences = defaultValue(schemaReferences, {});

    var ref = schema.$ref;

    if(typeof ref !== 'undefined' && ref.indexOf("configuration.") > -1 ){
        process.stdout.write("\nBasePath:"+basePath)
        basePath=basePath.replace("/feature", "/configuration")
        basePath=basePath.replace("\\feature", "\\configuration")
    }

    if (defined(ref)) {
        // TODO: $ref could also be absolute.
		if(ref.indexOf("#") > -1) {
			ref = ref.replace('#','');
		}
        var filePath = path.join(basePath, ref);
		
		process.stdout.write("\nFilepath for refSchema =  " + ref + "\n");
        var refSchema = JSON.parse(fs.readFileSync(filePath));

        // If a type is supposed to be ignored, that means that its contents should be applied
        // to the referencing schema, but it shouldn't be called out as a top-level type by itself
        // (meaning it would never show up in a table of contents or get its own documentation section).
        if (ignorableTypes.indexOf(ref.toLowerCase()) < 0) {
            if (refSchema.title in schemaReferences) {
                // update schema and fileName in case it was inserted by a child first
                schemaReferences[refSchema.title].schema = refSchema;
                schemaReferences[refSchema.title].fileName = ref;
                schemaReferences[refSchema.title].parents.push(parentTitle);
            }
            else {
                schemaReferences[refSchema.title] = { schema: refSchema, fileName: ref, parents: [parentTitle], children: [] };
            }

            if (parentTitle in schemaReferences) {
                schemaReferences[parentTitle].children.push(refSchema.title);
            }
            else {
                schemaReferences[parentTitle] = { schema: undefined, fileName: undefined, parents: [], children: [refSchema.title] };
            }
        }

        return replaceRef(refSchema, basePath, ignorableTypes, schemaReferences, schema.title === undefined ? parentTitle : schema.title);
    }

    for (var name in schema) {
        if (schema.hasOwnProperty(name)) {
            if (typeof schema[name] === 'object') {
                schema[name] = replaceRef(schema[name], basePath, ignorableTypes, schemaReferences, schema.title === undefined ? parentTitle : schema.title);
            }
        }
    }

    return schema;
}
