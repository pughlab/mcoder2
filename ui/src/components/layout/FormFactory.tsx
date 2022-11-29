import { useQuery } from "@apollo/client";
import { GET_FORMS } from "../form/utils.js";
import { FormGenerator } from "../form/FormGenerator";
import { Segment, Tab, Message, Image } from "semantic-ui-react";
import * as React from 'react'
import logo from '../logos/logo.png'
import * as R from 'remeda'



export default function FormFactory() {
  const { loading, error, data } = useQuery(GET_FORMS);
  if (loading) {
    return (
    <>
    <Segment loading style={{height: '100%'}}>
      <Image src={logo} centered size='medium' />
    </Segment>
    </>
  )
  }

  if (error) {
    return (
  <>
  <Message warning>
  <Message.Header>Something went wrong</Message.Header>
    <p>Restart the page, then try again.</p>
  </Message>
  </> 
  )
  }

  if (R.isNil(data)) {
    return null
  }
  // "Something went wrong";
  // console.log("hello")
  // console.log(data.forms[0])
  console.log("form:")
  console.log(data.forms)
  const paneData = data.forms.map(form => ({
    id: form.form_id,
    name: form.form_name,
    displayName: form.form_name,
    content: () => (
      <FormGenerator metadata={form} />
    )
  }))
  const panes = paneData.map((item) => {
    return { key: item.name, menuItem: item.displayName, render: () => <Tab.Pane>{item.content()}</Tab.Pane> }
  })
  return (
    <Segment>
      <Tab menu={{color:'teal', active: true, fluid: true, vertical: true, tabular: true }} panes={panes} />
    </Segment>
  );
}

// export default FormFactory;

