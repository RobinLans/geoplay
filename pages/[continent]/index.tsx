import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Db, MongoClient } from 'mongodb';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import styles from './index.module.css';
import { mouseMoveEvent, QuizData } from '../../types';
import type { GetStaticProps } from 'next';
import type { RootState } from '../../redux/store';
import Objective from '../../components/Objective';
import Countdown from '../../components/Countdown';
import GameStats from '../../components/GameStats';
import GameInfo from '../../components/GameInfo';
import { useAppDispatch, useAppSelector } from '../../hooks/hooks';
import { FeatureCollection, GeoJsonProperties, Geometry } from 'geojson';
import StatsModal from '../../components/StatsModal';
import { BiMenu } from 'react-icons/bi';
import SideMenu from '../../components/SideMenu';
import { handleShowSideMenu } from '../../redux/features/componentHandlingSlice';

interface Props {
  dataToReturn: QuizData;
  continent: string;
}

interface ICountry {
  countryId?: number;
  countryID?: number;
  countryName: string;
}

function GamePage({ dataToReturn }: Props) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [iteration, setIteration] = useState<number>();
  const [clickedCountries, setClickedCountries] = useState<ICountry[]>([]);
  const [correctClickedCountries, setCorrectClickedCountries] = useState<
    string[]
  >([]);
  const [correctCountriesClickedWrong, setCorrectCountriesClickedWrong] =
    useState<string[]>([]);
  const countriesList = useRef<string[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const coords = useAppSelector((state: RootState) => {
    return state.gameOptions.coordinates;
  });
  const zoomLevel = useAppSelector((state: RootState) => {
    return state.gameOptions.zoom;
  });
  const showSideMenu = useAppSelector((state: RootState) => {
    return state.componentHandling.showSideMenu;
  });

  const [showGameInfo, setShowGameInfo] = useState(false);
  const [playerHasClickedReady, setPlayerHasClickedReady] =
    useState<boolean>(false);
  const [countdownStarted, setCountdownStarted] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [gameIsOver, setGameIsOver] = useState<boolean>(false);
  const [finalTime, setFinalTime] = useState<number>(0);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  let hoveredCountryId = useRef<number>(-1);

  const playerIsReady = useAppSelector((state: RootState) => {
    return state.gameOptions.ready;
  });

  function populateCountries() {
    const countries: string[] = dataToReturn.features.map((country) => {
      return country.properties.name;
    });

    shuffleArray(countries);
    countriesList.current = countries;
    setIteration(0);
  }

  function shuffleArray(arr: string[]) {
    arr.sort(() => Math.random() - 0.5);
  }

  useEffect(() => {
    if (!playerIsReady) {
      router.push('/');
    }
    if (map.current) return;

    map.current = new mapboxgl.Map({
      accessToken: process.env.NEXT_PUBLIC_MB_ACCESS_TOKEN,
      container: mapContainer.current!,
      style: 'mapbox://styles/tjorben/cl3t89ay5000615knxkcvfr67',
      center: [coords.lng, coords.lat],
      zoom: zoomLevel,
    });

    map.current.on('load', () => {
      map.current?.addSource('countries', {
        type: 'geojson',
        data: dataToReturn as FeatureCollection<Geometry, GeoJsonProperties>,
        generateId: true,
      });

      // Whn the style has loaded, this code will run
      map.current?.on('styledata', () => {
        // here we check if the layer already exists we cancel the function
        if (map.current?.getLayer('country-fills')) return;
        map.current?.addLayer({
          id: 'country-fills',
          type: 'fill',
          source: 'countries',
          layout: {},
          paint: {
            'fill-color': [
              'case',
              ['==', ['feature-state', 'answer'], 'correct'], // if correct == true
              '#04ff86', // ...then color the polygon this color
              ['==', ['feature-state', 'answer'], 'incorrect'], // if correct == false
              '#e51b0e', // ...then color the polygon this color
              ['==', ['feature-state', 'hover'], true], // if the polygon is being hovered over
              '#fff', // ...then color the polygon white
              '#000', // this is the fallback value if neither of the cases above happens
            ],
            'fill-opacity': 0.5,
          },
        });

        map.current?.addLayer({
          id: 'borders',
          type: 'line',
          source: 'countries',
          layout: {},
          paint: {
            'line-color': '#ECA400',
            'line-width': 2,
          },
        });
      });
    });
    map.current?.on('mouseenter', 'country-fills', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = 'pointer';
    });

    map.current?.on('mousemove', 'country-fills', (e: mouseMoveEvent) => {
      const mapFeatures: mapboxgl.MapboxGeoJSONFeature[] | undefined =
        e.features;
      if (hoveredCountryId.current === mapFeatures?.[0].id) return;

      if (mapFeatures && mapFeatures.length > 0) {
        if (hoveredCountryId.current > -1) {
          map.current?.setFeatureState(
            { source: 'countries', id: hoveredCountryId.current },
            { hover: false }
          );
        }
        hoveredCountryId.current = mapFeatures[0].id as number;
        map.current?.setFeatureState(
          { source: 'countries', id: hoveredCountryId.current },
          { hover: true }
        );
      }
    });
    map.current?.on('mouseleave', 'country-fills', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';

      if (hoveredCountryId.current !== -1) {
        map.current.setFeatureState(
          { source: 'countries', id: hoveredCountryId.current },
          { hover: false }
        );
      }

      hoveredCountryId.current = -1;
    });
    map.current.on('click', 'country-fills', (e: mouseMoveEvent) => {
      if (!countriesList) return;

      const mapFeatures: mapboxgl.MapboxGeoJSONFeature[] | undefined =
        e.features;

      const countryID = mapFeatures?.[0].id as number | undefined;
      const countryName = mapFeatures?.[0].properties?.name;

      const countryObj: ICountry = {
        countryID,
        countryName,
      };
      setClickedCountries((prevValue): ICountry[] => {
        return [...prevValue, countryObj];
      });

      setIteration((prevValue) => {
        if (prevValue) {
          return prevValue + 1;
        } else {
          return 1;
        }
      });
    });

    populateCountries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const index: number = clickedCountries.length;
    const pickedCountry: ICountry = clickedCountries[index - 1];
    const correctCountry: string = countriesList.current[index - 1];

    if (!pickedCountry) return;

    if (pickedCountry.countryName === correctCountry) {
      setAnswer('correct');
      setCorrectClickedCountries((prevValue: string[]) => {
        return [...prevValue, correctCountry];
      });
    } else {
      setAnswer('incorrect');
      setCorrectCountriesClickedWrong((prevValue: string[]) => {
        return [...prevValue, correctCountry];
      });

      const containCountry: boolean = correctCountriesClickedWrong.includes(
        pickedCountry.countryName
      );

      if (containCountry) return;

      setTimeout(() => {
        setAnswer('changeBack');
      }, 200);
    }

    isGameOver();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickedCountries]);

  useEffect(() => {
    const index: number = clickedCountries.length;
    const pickedCountry: ICountry = clickedCountries[index - 1];

    if (!pickedCountry) return;

    if (answer === '') return;

    if (answer === 'correct') {
      map.current?.setFeatureState(
        { source: 'countries', id: pickedCountry.countryID },
        {
          answer: answer,
        }
      );
      setAnswer('');
      return;
    }
    if (correctClickedCountries.includes(pickedCountry.countryName)) {
      console.log('finns redan');
      setAnswer('');
      colorCorrectCountry(index);
      return;
    }
    if (answer === 'incorrect') {
      map.current?.setFeatureState(
        { source: 'countries', id: pickedCountry.countryID },
        {
          answer: answer,
        }
      );
      colorCorrectCountry(index);
    }
    if (answer === 'changeBack') {
      map.current?.setFeatureState(
        { source: 'countries', id: pickedCountry.countryID },
        {
          answer: answer,
        }
      );
    }

    hoveredCountryId.current = -1;
    setAnswer('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer]);

  function colorCorrectCountry(index: number) {
    const correctCountry: string = countriesList.current[index - 1];
    const features: mapboxgl.MapboxGeoJSONFeature[] | undefined =
      map.current?.queryRenderedFeatures(undefined, {
        layers: ['country-fills'],
      });

    features?.forEach((feature: mapboxgl.MapboxGeoJSONFeature) => {
      if (feature?.properties?.name === correctCountry) {
        map.current?.setFeatureState(
          { source: 'countries', id: feature.id },
          {
            answer: 'incorrect',
          }
        );
      }
    });
  }

  function isGameOver() {
    if (
      countriesList.current.length > 0 &&
      countriesList.current.length === clickedCountries.length
    ) {
      if (gameIsOver) return;
      setGameIsOver(true);
    }
  }

  return (
    <div ref={mapContainer} className={styles.container}>
      <button
        className={styles.profileButton}
        onClick={() => dispatch(handleShowSideMenu(true))}
        data-testid="profileButton"
      >
        <BiMenu />
      </button>

      {showSideMenu && (
        <SideMenu
          page="Game"
          playerHasClickedReady={playerHasClickedReady}
          setShowGameInfo={setShowGameInfo}
        />
      )}

      {typeof iteration === 'number' && gameStarted && !gameIsOver && (
        <Objective objective={countriesList.current[iteration]} />
      )}
      {(!playerHasClickedReady || showGameInfo) && (
        <GameInfo
          setPlayerHasClickedReady={setPlayerHasClickedReady}
          setCountdownStarted={setCountdownStarted}
          showGameInfo={showGameInfo}
          setShowGameInfo={setShowGameInfo}
        />
      )}
      {countdownStarted && (
        <Countdown
          setCountdownStarted={setCountdownStarted}
          setGameStarted={setGameStarted}
        />
      )}
      {!gameStarted && <div className={styles.overlay}></div>}
      {gameStarted && (
        <GameStats
          correctClickedCountries={correctClickedCountries}
          countriesList={countriesList.current}
          gameIsOver={gameIsOver}
          setFinalTime={setFinalTime}
          setShowStatsModal={setShowStatsModal}
        />
      )}
      {showStatsModal && (
        <StatsModal
          allCountries={countriesList.current.length}
          correctCountries={correctClickedCountries.length}
          time={finalTime}
          setGameStarted={setGameStarted}
        />
      )}
    </div>
  );
}

export default GamePage;

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////

export const getStaticProps: GetStaticProps = async (context) => {
  if (!context.params) {
    return { props: {} };
  }
  const params: string | undefined | string[] = context.params.continent;

  if (typeof params !== 'string') {
    return { props: {} };
  }
  const continentString: string = params?.replace(' ', '');

  const user: string | undefined = process.env.DB_USER;
  const password: string | undefined = process.env.DB_PASSWORD;
  const databaseName: string | undefined = process.env.DB_NAME;

  const client = await MongoClient.connect(
    'mongodb+srv://' +
      user +
      ':' +
      password +
      '@cluster0.wb3yq.mongodb.net/' +
      databaseName +
      '?retryWrites=true&w=majority'
  );

  const db: Db = client.db();
  const geojsonData = db.collection('geojsonData');

  const data = await geojsonData.find().toArray();

  let dataToFetch: string;
  for (const continent of Object.entries(data[0])) {
    if (continent[0].toLocaleLowerCase() === continentString) {
      dataToFetch = continent[1];
    }
  }

  async function fetchJsonData() {
    const response: Response = await fetch(dataToFetch);
    const data = await response.json();

    return data;
  }
  const dataToReturn = await fetchJsonData();

  return {
    props: {
      dataToReturn,
    },
    revalidate: 1,
  };
};

export async function getStaticPaths() {
  const user: string | undefined = process.env.DB_USER;
  const password: string | undefined = process.env.DB_PASSWORD;
  const databaseName: string | undefined = process.env.DB_NAME;

  const client: MongoClient = await MongoClient.connect(
    'mongodb+srv://' +
      user +
      ':' +
      password +
      '@cluster0.wb3yq.mongodb.net/' +
      databaseName +
      '?retryWrites=true&w=majority'
  );

  const db: Db = client.db();
  const geojsonData = db.collection('geojsonData');

  const data = await geojsonData.find().toArray();

  const continentsArray: string[] = [];
  for (const continent of Object.entries(data[0])) {
    if (continent[0] !== '_id') {
      continentsArray.push(continent[0].toLocaleLowerCase());
    }
  }

  return {
    fallback: false,
    paths: continentsArray.map((continent) => ({
      params: {
        continent: continent.toString(),
      },
    })),
  };
}
