import "regenerator-runtime/runtime";

import { Configuration, OpenAIApi } from "openai";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import process from "process/browser";
import { useState } from "react";

function App() {
  const defaultProfile = {
    photo: "",
    preferences: [],
    interests: [],
    persona: {
      full_name: "string",
      age: 0,
      interests_tags: [],
      works_at: "company name",
      top_5_professions: [],
      job_title: "string",
      country: "string",
      city: "string",
      skin_color: "#rrggbb",
      hair_color: "#rrggbb",
      eye_color: "#rrggbb",
      hair_length_cm: 0,
      height_cm: 0,
      hair_style: "string",
      gender: "string",
    },
  };
  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const say = (text) => {
    // text to speech
    console.log(text);
  };

  const intro = async () => {
    setMessage('You can say "help" to get a list of commands');
    say(message);
  };

  const help = async () => {
    setMessage(
      "You can use the following commands:\n" +
        "help - Shows this message\n" +
        "clear - Clears the screen\n"
    );
    say(message);
  };

  const onCommand = async (command) => {
    switch (command) {
      case "help":
        await help();
        break;
      case "clear":
        setProfile(defaultProfile);
        setMessage("");
        sr.resetTranscript();
        break;
      default:
        await intro();
        break;
    }
  };
  const commands = [
    // {
    //   command: 'Generate an image of *',
    //   callback: async (description) => await generateImage(description)
    // },
    {
      command: "Create a profile of * interested in *",
      callback: async (preferences, interests) =>
        await generateProfile(preferences, interests),
    },
    {
      command: ["help", "clear"],
      callback: (command) => onCommand(command),
    },
  ];

  const sr = useSpeechRecognition({ commands });

  if (sr.browserSupportsContinuousListening) {
    SpeechRecognition.startListening({ continuous: true });
  } else {
    return <span>Browser does not support speech recognition.</span>;
  }

  if (typeof process !== "undefined") {
    // Use process.env here
  } else {
    // Handle the case where process.env is not available
  }

  const configuration = new Configuration({
    apiKey: process.env.VITE_OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  const sendPrompt = async (prompt, callback, error) => {
    setLoading(true);
    try {
      const result = await openai.createCompletion({
        model: "gpt-3.5-turbo",
        prompt: JSON.stringify(prompt),
        temperature: 0.5,
        max_tokens: 1000,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });
      callback(result.data.choices[0].text);
    } catch (e) {
      error("Something is going wrong, Please try again.");
    }
    setLoading(false);
  };

  // const generateImage = async (description) => {
  //   setLoading(true);
  //   const response = await openai.createImage({
  //     prompt: description,
  //     n: 1,
  //     size: "512x512",
  //   });
  //   setLoading(false);
  //   setResult(response.data.data[0].url);
  // };

  const createProfilePrompt = async (profile) => {
    const inputModel = {
      preferences: "string",
      interests: [],
    };
    //generate a comma separated list of each property of inputModel
    const inputModelString = Object.keys(inputModel).join(", ");

    const responseModel = {
      full_name: "string",
      age: "integer",
      interests_tags: [],
      works_at: "company name",
      top_5_professions: [],
      job_title: "string",
      country: "string",
      city: "string",
      skin_color: "#rrggbb",
      hair_color: "#rrggbb",
      eye_color: "#rrggbb",
      hair_length_cm: "integer",
      height_cm: "integer",
      hair_style: "string",
      gender: "string",
    };
    //generate a comma separated list of each property of responseModel
    const responseModelString = Object.keys(responseModel).join(", ");

    const messages = [
      {
        role: "system",
        content: `The text is a json object with ${inputModelString} to describe a persona to generate.\nThe answer is a json with the properties: ${responseModelString}`,
      },
      {
        role: "user",
        content: JSON.stringify(profile),
      },
    ];

    return {
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };
  };

  const createProfileImagePrompt = async (profile) => {
    const messages = [
      {
        role: "system",
        content:
          "The text is a json object which describes the persona of the person for generating a profile picture",
      },
      {
        role: "user",
        content: profile,
      },
    ];

    return {
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    };
  };

  const generateProfile = async (preferences, interests) => {
    setLoading(true);
    profile.preferences = preferences;
    profile.interests = interests;

    console.log(JSON.stringify(profile, null, 2));

    const profilePrompt = createProfilePrompt(profile);
    console.log(JSON.stringify(profilePrompt, null, 2));

    await sendPrompt(
      profilePrompt,
      (result) => {
        profile.persona = result;
      },
      (error) => {
        console.log(JSON.stringify(error, null, 2));
      }
    );

    const profileImagePrompt = createProfileImagePrompt(profile);
    console.log(JSON.stringify(profileImagePrompt, null, 2));

    const response = await openai.createImage({
      prompt: profileImagePrompt,
      n: 1,
      size: "256x256",
    });

    console.log(JSON.stringify(response, null, 2));

    profile.photo = response.data[0].url;

    setProfile(profile);

    setLoading(false);
  };

  return (
    <div className="app">
      <h1>React AI Image Generator</h1>
      {loading ? <h2> Generating your image...</h2> : <></>}
      <div className="card">
        <textarea className="text-input" value={sr.finalTranscript} />
        <p>Microphone: {sr.listening ? "on" : "off"}</p>

        <textarea
          className="text-input"
          placeholder="Speak your prompt"
          value={sr.transcript}
          readOnly={true}
          rows="5"
          cols="50"
        />
        <button className="button" onClick={SpeechRecognition.startListening}>
          Start Listening
        </button>
        <button className="button" onClick={SpeechRecognition.stopListening}>
          Stop Listening
        </button>
        {profile.length > 0 ? (
          <div className="profile-card">
            <img
              className="result-image"
              src={profile.photo}
              defaultValue={defaultProfile}
              alt="Generated Image"
            />
            <h2>{profile.full_name}</h2>
            <p>
              <strong>Age:</strong> {profile.age}
            </p>
            <p>
              <strong>Interests:</strong>{" "}
              {profile.interests_tags.map((tag) => `#${tag}`).join(" ")}
            </p>
            <p>
              <strong>Works at:</strong> {profile.works_at}
            </p>
            <p>
              <strong>Top professions:</strong>{" "}
              {profile.top_5_professions.join(", ")}
            </p>
            <p>
              <strong>Job Title:</strong> {profile.job_title}
            </p>
            <p>
              <strong>Location:</strong> {profile.city}, {profile.country}
            </p>
            <div
              style={{
                backgroundColor: profile.skin_color,
                height: "50px",
                width: "50px",
              }}></div>
            <div
              style={{
                backgroundColor: profile.hair_color,
                height: "50px",
                width: "50px",
              }}></div>
            <div
              style={{
                backgroundColor: profile.eye_color,
                height: "50px",
                width: "50px",
              }}></div>
            <p>
              <strong>Hair length:</strong> {profile.hair_length_cm} cm
            </p>
            <p>
              <strong>Height:</strong> {profile.height_cm} cm
            </p>
            <p>
              <strong>Hair style:</strong> {profile.hair_style}
            </p>
            <p>
              <strong>Gender:</strong> {profile.gender}
            </p>
          </div>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

export default App;
