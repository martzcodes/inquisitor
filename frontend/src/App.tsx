import { useEffect, useState } from "react";
import axios from 'axios';
import AsyncApiComponent from "@asyncapi/react-component";

function App() {
  const [spec, setSpec] = useState({
    asyncapi: "2.1.0",
    info: {
      title: "Discovered EventBridge Events",
      version: "0.0.1",
    },
    channels: {},
    components: {
      messages: {},
      schemas: {},
    },
  });

  const getSchema = async () => {
    try {
    const { data } = await axios.get(
      "https://inquisitorstack-359317520455-inquisitorapibucket.s3.amazonaws.com/latest.yml"
    );
    setSpec(data);
    } catch(e) {
      console.error(e);
    }
  }

  useEffect(() => {
    getSchema();
  }, []);

  return (
    <div className="App">
      <AsyncApiComponent
        schema={spec}
        config={{
          schemaID: "",
          show: {
            sidebar: true,
            info: true,
            operations: true,
            servers: true,
            messages: true,
            schemas: true,
          },
        }}
      />
    </div>
  );
}

export default App;
