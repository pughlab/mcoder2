import React, { useEffect, useState } from "react";
import { Form, Divider, Header, Icon, Button, Radio, Label } from "semantic-ui-react";
import { useQuery, useLazyQuery, useMutation } from "@apollo/client";
// import { z } from "zod";
import * as R from "remeda" 

import {
  FieldData,
  NodeExist,
  CreateNode,
  constructDropdown,
  ParseFormToGraphQL,
  doesNotMeetAllConditions,
  getKeysValuePair,
  parseFormIDCTX,
  NodeGetCTX
} from "./utils";

import { TableTool } from "./table/FormTable";


export function FormGenerator({ metadata, patientIdentifier }) {

  console.log("identifier KEYS")
  console.log(metadata.identifier)
  // const [validationObject, setValidationObject] = useState({});
  const [globalFormState, setGlobalFormState]      = useState({});      // Global State of the current form that holds all data inputs
  const [uniqueIdsFormState, setUniqueIdFormState] = useState({});      // Contains all the form States unique IDs and there inputs within the current form
  const [option, setOption]                        = useState({});      // Options of the Select Component fields **TODO: CHANGE AND STORE WITHIN BACKEND***

  const [nodeEvent, setNodeEvent]                  = useState("submit");// Protocol State in which to handle the data within the form when it is submited 
                                                                        // to be processed to the backend

  const [ctx, setCTX]                              = useState({})       // Context (ctx) holds all the information of form that hold being refrenced by
                                                                        // either the identifiers, and foreign keys

  // identifier is a referance to root of the form directed acyclic graph in which all forms use there primary key
  const identifier                                 = metadata.identifier.filter(
                                                      (fld) => !metadata.primary_key.map((fld) => fld.name).includes(fld.name)
                                                    );
  // primary identifier of the current form. This allows us to be able to identify the node that will
  // the backend later on
  const primaryKeys                                = metadata.primary_key.filter(
                                                      (field) =>
                                                        !identifier
                                                          .map((fld) => JSON.stringify(fld))
                                                          .includes(JSON.stringify(field))
                                                    );
  // foreign identifier of the current form. This is the identifier that connects to other existing forms and there
  // primary identifier
  const foreignKeys                                = metadata.foreign_key.edges;


  // (Populate Form Fields GraphQL Query) that loads all field data within the form
  const {
    loading: loadFieldData,
    error: errorFields,
    data: formFields,
  } = useQuery(FieldData, {
    variables: { id: metadata.form_id },
  });


  // (Populated Sumbitter Node Exist Query) 
  const [getNodeExist] = useLazyQuery(NodeExist, {
    fetchPolicy: "network-only",
  });

  // (Context GraphQL Query) given there is a foreign or an identifier
  // give inter connection context to the form allowing form to have inter
  // connected conditions
  const {
    data: FormFieldsCTX,
  } = useQuery(NodeGetCTX, {
    variables: parseFormIDCTX({identifier, foreignKeys}, uniqueIdsFormState),
  });

  const [createNode] = useMutation(CreateNode);

  // On First Component Render 
  // make sure all states are wiped from
  // any changes like for example a change from
  // one form to another.
  useEffect(() => {
    // setValidationObject({})
    setUniqueIdFormState({});
    setGlobalFormState({});
    // setOption({})

    // populate form foreign keys, primary keys, identifier
    const ids = [
      ...identifier,
      ...primaryKeys,
      ...foreignKeys.map((fk) => fk.node),
    ];
    // ids.map((field) =>
    //   setUniqueIdFormState((id) => ({
    //     ...id,
    //     [field.name]: field.value,
    //   }))
    // );

    setUniqueIdFormState({
      ... (R.mapToObj(ids, field => [field.name, field.value])),
      submitter_donor_id: patientIdentifier.submitter_donor_id, program_id: patientIdentifier.program_id
    })

    // eslint-disable-next-line
  }, [metadata, patientIdentifier]);
  
  useEffect(() => {

    // this conceptual works if all keys within each form are diffrent
    // fixes that might be done at a later time
    // NOTE (For Later...): 
    // - assign ctx to form it comes from to be able deal with forms
    //   that might contain the same field name
    if (typeof FormFieldsCTX === "object" && FormFieldsCTX.ctx.length > 0){
      if (Object.keys(ctx).length > 0) setCTX({});
      FormFieldsCTX.ctx[0].fields.forEach((fld) => {
        setCTX((ctx) => ({
          ...ctx,
          [fld["key"]] : fld["value"],
        }))
      })

     FormFieldsCTX.ctx[0].references.forEach((form) => {
        form.fields.forEach((fld)=> {  
          setCTX((ctx) => ({
            ...ctx,
            [fld["key"]] : fld["value"],
          }))
        })
      })


    }

  // eslint-disable-next-line
  },[FormFieldsCTX])

  console.log(uniqueIdsFormState)

  
  const onFormComplete = async () => {
    // Validate Form
    //...
    //...
    // if there are foreign keys then need
    // to check if it is consistent

    // if there exist a fogien key 
    // check with the context state (ctx) 
    // if the form exist with in the

    // create the muation variables to populate the neo4j... 
    
    console.log(uniqueIdsFormState)
    const formCreateSchema = ParseFormToGraphQL(
        { ids: uniqueIdsFormState, fields: globalFormState, form_id: metadata.form_id },
        {
          identifier,
          primaryKeys,
          foreignKeys,
          formFields: formFields.PopulateForm,
        });

    // console.log(JSON.stringify(formCreateSchema))

    // given if the node exist then do not populate the backend
    // alert the user in anyway...
    // const doseNodeExist = await getNodeExist({
    //   variables: {
    //     where: {
    //       form: metadata.form_id,
    //       primary_keys: formCreateSchema.primary_keys,
    //     },
    //   },
    // });

    // if (doseNodeExist.data.exist.length) {
    //   alert("Node exists");
    //   return;
    // } // do nothing


    console.log(formCreateSchema)
    createNode({variables  : { "input" : [formCreateSchema]}})
    // if (nodeEvent === "submit"){
    //   createNode({variables  : { "input" : [formCreateSchema]}})
    //   alert("submit")
    // } else {
    //   alert("Update Do Nothing... Right now");
    //   return;
    // }
  }


  // when data is recived then update global form state and as well populate the option necessary
  // for the select components
  useEffect(() => {
    if (formFields !== undefined) {
      // populate form other fields
      if(Object.keys(globalFormState).length > 0){
        setGlobalFormState({})
        setOption({})

      }

      formFields.PopulateForm.forEach((field) => {
        
        if (field.component === "Select") {
          setOption((opt) => ({
            ...opt,
            ...{ [`${field.name}`]: constructDropdown(field.set) },
          }));
        }
        
        setGlobalFormState((fld) => ({
          ...fld,
          [field.name]: field.value,
        }));

        // UNCOMMENT WHEN FINISHED 
        // =================================
        // CURRENT STATE: (**Not Finished**)
        // =================================
        // setValidationObject((fld) => (z.object({
        //   ...fld,
        //   [field.name] : null,
        // })))

      });
    }
    // eslint-disable-next-line
  }, [formFields, patientIdentifier]);

  //  not return anything to the DOM if the data is not loaded
  if (loadFieldData) return <></>;
  else if (errorFields) return `Somthing went wrong within the backend ${errorFields}`;
  
  console.log(globalFormState)
  return (
    <div
      key={metadata.form_name}
      style={{ paddingLeft: "60px", paddingRight: "60px" }}
    >
      <Form
        size="small"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <Divider horizontal>
          <Header as='h4'>
            <Icon name='id card' />
            IDs
          </Header>
        </Divider>
        <Form.Group widths={"equal"}>
          {identifier.map((fld) => (
            <Form.Input
            name={fld.name}
            value={uniqueIdsFormState[fld.name]}
            type={fld.type}
            label={fld.label}
            placeholder={fld.placeholder}
            onChange={(e) => {setUniqueIdFormState((f) => ({...f, [e.target.name] : e.target.value}))}}
          />
          ))}
        </Form.Group>

        <Form.Group widths={"equal"}>
          {primaryKeys.map((fld) => (
            <Form.Input
            name={fld.name}
            value={uniqueIdsFormState[fld.name]}
            type={fld.type}
            label={fld.label}
            placeholder={fld.placeholder}
            onChange={(e) => {setUniqueIdFormState((f) => ({...f, [e.target.name] : e.target.value}))}}
          />
          ))}
        </Form.Group>

        <Form.Group widths={"equal"}>
          {foreignKeys.map((fld) => {
           return ( <Form.Input
            name={fld.node.name}
            value={uniqueIdsFormState[fld.node.name]}
            type={fld.node.type}
            label={fld.node.label}
            placeholder={fld.node.placeholder}
            onChange={(e) => {setUniqueIdFormState((f) => ({...f, [e.target.name] : e.target.value}))}}
          />)
          })}
        </Form.Group>
        <Divider hidden/>
        <Divider horizontal>
          <Header as='h4'>
            <Icon name='folder open' />
            DATA
          </Header>
        </Divider>
        <TableTool form={metadata.form_id}
                   searchBy={!identifier.length}
                   identifier={getKeysValuePair(identifier.map(id => id.name), uniqueIdsFormState)}
                   primaryKeys={getKeysValuePair(primaryKeys.map(pk => pk.name), uniqueIdsFormState)}
                   updateUniqueIdsFormState={setUniqueIdFormState}
                   updateGlobalFormState={setGlobalFormState}/>


        {option && formFields.PopulateForm.map((fld) => {
          var comp = <></>;

          // add new components here - e.g. if for >5 then Button Select and also change field type in Neo4j for that field
          switch (fld.component) {
            case "Input":
              comp = (
                <Form.Input
                name={fld.name}
                value={globalFormState[fld.name]}
                type={fld.type}
                label={fld.label}
                placeholder={fld.placeholder}
                onChange={(e) => {setGlobalFormState((f) => ({...f, [e.target.name] : e.target.value}))}}
                disabled={fld.conditionals === null ? false : doesNotMeetAllConditions(fld.conditionals, globalFormState, ctx)}
              />
              );
              break;
            case "Select":
            
              if (option[fld.name] === undefined) break; 

              if (option[fld.name].length <=4) {
                comp = (

                  <>
                    <Form.Field label={fld.label}></Form.Field>

                    <Form.Group widths={option[fld.name].length} >

                      

                        {R.map(
                          option[fld.name],
                          selectOption => 
                            <Form.Field 
                            control={Radio} 
                            checked={globalFormState[fld.name] === selectOption.value} 
                            label={selectOption.text} 
                            onChange={(e) => setGlobalFormState((fields) => ({ ...fields, ...{ [fld.name]: selectOption.value } }))}
                            disabled={fld.conditionals === null ? false : doesNotMeetAllConditions(fld.conditionals, globalFormState, ctx)}
                            />
                          
                        )}         
                    </Form.Group>
                    </>
                )
              } else {
              comp = (
                <Form.Select
                key={fld.name}
                // search={option[fld.name].length > 8}
                search
                name={fld.name}
                value={globalFormState[fld.name]}
                multiple={fld.type === "mutiple"}
                placeholder={fld.placeholder}
                label={fld.label}
                options={option[fld.name]} 
                onChange={(e, { name, value }) => setGlobalFormState((fields) => ({ ...fields, ...{ [name]: value } }))}
                clearable
                disabled={fld.conditionals === null ? false : doesNotMeetAllConditions(fld.conditionals, globalFormState, ctx)}
              />);
              }
              break;
            default:
              break;
          }
          return comp;
        })}

        <Button.Group size="large" fluid>
          <Button
            icon='send'
            size='huge'
            content="SUBMIT"
            color='teal' 
            // style={{ backgroundColor: '#01859d'}}            
            onClick={() => {
              // setNodeEvent("submit");
              // setNodeEvent("submit");
              onFormComplete();
              // createNode({variables  : { "input" : [formCreateSchema]}})
            }}
          ></Button>
          <Button.Or/>
          <Button
            icon='sync alternate'
            content="UPDATE"
            color="black"
            style={{ backgroundColor: '#01859d'}}            
            disabled
            onClick={() => {
              setNodeEvent("update");
              // console.log(uniqueIdsFormState)
            }}
          ></Button>
        </Button.Group>
      </Form>
    </div>
  );
}