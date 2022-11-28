import { gql } from "@apollo/client";
import { v4 as uuidv4 } from "uuid";
import {z} from 'zod'


export const GET_FORMS = gql`
query Query {
  forms {
    form_id
    form_name
    identifier {
      description
      label
      name
      placeholder
      value
      type
    }
    primary_key {
      component
      conditionals
      description
      label
      name
      placeholder
      regex
      required
      set
      type
      value
    }
    foreign_key : foreign_keyConnection {
      edges {
        constraint
        node {
        component
        conditionals
        description
        label
        name
        placeholder
        regex
        required
        set
        type
        value
        form : primary_key_to {
          form_id
        }
        }
      }
    }  
  }
}`;

export const FieldData = gql`
query PopulateForm($id: String!) {
  PopulateForm(id: $id) {
    component
    conditionals
    description
    label
    name
    regex
    required
    set
    type
    value
    filter
  }
}
`;

export const CopyFormMutation = gql`
mutation Create_Form_Copy($form: String!, $primary_keys: Conditional!, $key_value_pair: [Object!]!) {
  Create_Form_Copy(form: $form, primary_keys: $primary_keys, key_value_pair: $key_value_pair){
    values {
      key
      value
    }
  }
}
`;


export const NodeExist = gql`
query($where: SubmitterWhere) {
  exist : submitters(where: $where) {
    uuid
    form
    primary_keys
  }
}`;

export const NodeGetCTX = gql`
query Submitters($where: SubmitterWhere, $referencePrimary: SubmitterWhere) {
  ctx : submitters(where: $where) {
    primary_keys
    form
    fields {
      key
      value
    }
    references : reference_primary_key(where: $referencePrimary) {
      form
      primary_keys
      fields {
        key
        value
      }
    }
  }
}
`

/**
 * naive validation 
 * @param {*} param0 
 * @returns 
 */
export function determineFieldValidation(field) {
  // console.log(type, regex, required)
  let schema = z



  const dateSchema = z.preprocess((arg) => {
    if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
  }, z.date());


  // if (type === "text"){
  //   schema = regex !== "" ? schema.string().regex(new RegExp(regex), { message : "The text you have filled in does not match the standard expression"}).min(2) : schema.string().min(2)
  // } else if ( type === "number"){
  //   schema = schema.number()
  // } else if (type === "date"){
  //   // fix later 
  //   // schema = schema.string().regex(new RegExp(regex)).min(2)
  //   schema = schema.date()
  // }

  // if (!required){
  //   schema = schema.optional()
  // }

  return schema
}

export const ParseError = (arr) => {
  return arr.map((issue, index) => {
    if (arr.length === 1) return `${issue.message}`;
    return index === arr.length - 1
      ? `and ${issue.message}`
      : `${issue.message}, `;
  });
}


const ObjectInputType = (formState, fieldsMetaData) => {
    let arr = []
    let cond = {}
  console.log(fieldsMetaData)
    fieldsMetaData.forEach((value) => {
        cond[value.name] = value.conditionals === null ? false : doesNotMeetAllConditions(value.conditionals, formState)
    })

    for (const prop in formState){
      if (cond[prop]) continue
      arr.push({ "node" : {key : prop, value : formState[prop] }}) // condition are met then set it to the value else set default value
    }
    return {"fields" : {"create" : arr} }
}

export const doesNotMeetAllConditions = (conditionals, gfs, ctx={}, check = []) => {
  // =====================
  // Conditional Handler
  // =====================
  if (conditionals === null) return false
  Object.keys(conditionals).forEach((key) => {
      if (conditionals[key] === gfs[key]) check.push(ctx[key] === conditionals[key] || conditionals[key] === gfs[key] ); 
      else if (ctx[key] === undefined) return
      else check.push(ctx[key] === conditionals[key] );
    });
    // if (ctx[key] === undefined) return true

  return check.includes(false);
};

export const constructDropdown = (values, menu = []) => {
  // =====================
  // Construct Dropdown
  // =====================
  
  values.forEach((value, index) => {
    menu.push({key: index, text: value, value: value });
  });
  return menu;
};



/**
[
    {
      "primary_keys": {"Test_00" : "TEST"},
      "form": "vivona_test",
      "uuid": "vivona",
      "fields": {
        "create": [
          {
            "node": {
              "key": "Hello",
              "value": "world"
            }
          },
          {
            "node": {
              "key": "Hello_00",
              "value": "world_00"
            }
          },
        ]
      },
      "reference_key": {
        "connect": [
          {
            "where": {
              "node": {
                "OR": [
                  {
                    "primary_keys": {"program_id":"UHN","submitter_donor_id":"N0-00-02"}

                  },
                  {
                    "primary_keys" : {"test_id":"TEST"}
                  }
                ]
              }
            }
          }
        ]
      },
    }
  ]
 */

export const getKeysValuePair = (keys, object) => {
  let tempObject = {} // initialize object
  keys.forEach((key) => {
    tempObject[key] = object[key] // with the given keys assign key and value within that object
  })
  return tempObject
}

export const sortForeignKeys = (feildState, fks) => {

  let bucket = {} // initialize bucket will hold all the 
                  // primary keys of each foreign keys referenced in form
  
  // loop through all the reference_key (foreign keys)
  // dump them within there own form bucked
  fks.forEach(fk => {
    if (bucket[fk.node.form.form_id] === undefined) 
      bucket[fk.node.form.form_id] = { "form" : fk.node.form.form_id, "primary_keys" : {}}
    bucket[fk.node.form.form_id] = {...bucket[fk.node.form.form_id], "primary_keys" : {...bucket[fk.node.form.form_id].primaryKeys, ...getKeysValuePair([fk.node.name], feildState)}}    
  })

  // [{
  //  form : ...,
  //  primary_key : ... ,
  // },...]
  // return an array of all the referenced forms 
  console.log(!Object.keys(bucket).length)
  return !Object.keys(bucket).length ? [] : Object.keys(bucket).map(reference => bucket[reference])
}

export const ParseFormToGraphQL = (form, fields) => {
  console.log(form, fields)
  console.log(getKeysValuePair(fields.identifier.map(id => id.name), form.ids))
  return {"form": form.form_id,
          "uuid": uuidv4(),
          "primary_keys" : getKeysValuePair(fields.primaryKeys.map(pk => pk.name), form.ids),
          ...ObjectInputType(form.fields ,fields.formFields),
          ...fields.foreignKeys.concat(fields.identifier).length ? 
          {"reference_key": 
            { "connect": [ 
                            {"where": 
                              {"node": { "OR" : [
                                              ...sortForeignKeys(form.ids, fields.foreignKeys),
                                              ...getKeysValuePair(fields.identifier.map(id => id.name), form.ids)
                                          ]
                                       }
                              } 
                            } 
                          ]
            }
          } : {}
         };
}

  /**{
  "where": {
    "primary_keys": {
          "TEST": "OUTPUT 0"
    }
  },
  "referencePrimary": {
    "OR": [
      { "form"   : "bbc",
        "primary_keys" : { 
        "TEST" : "OUTPUT 1"}},
      { "form"         : "ccd" ,
        "primary_keys" : {"TEST" : "OUTPUT 2"}},
    ]
  }
} */

export const parseFormIDCTX = (fields,state) => {
  if (fields === null || state === {}) return {}
  return { "where" :
           {"primary_keys" :  fields.identifier.length === 0 ? null :  getKeysValuePair(fields.identifier.map(id => id.name), state) },
           "referencePrimary": {
            "OR": [
              ...sortForeignKeys(state, fields.foreignKeys)
            ],
            }
  }
}