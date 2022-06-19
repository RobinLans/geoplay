import React, { useState, MouseEvent } from "react";
import Link from "next/link";
import style from "../styles/SmallMenu.module.css";
import { AiFillCaretUp } from "react-icons/ai";

function SmallMenu() {
    const [inputClick, setInputClick] = useState<boolean>(false);
    const [chosenCountry, setChosenCountry] = useState<string>("Europe");
    const [countriesToggled, setCountriesToggled] = useState<boolean>(true);
    const countries: string[] = [
        "Europe",
        "North America",
        "South America",
        "Asia",
        "Africa",
        "Oceania",
        "World",
    ];

    function handleInputClick() {
        setInputClick((prevValue) => {
            return !prevValue;
        });
    }

    function handleChosenCountry(e: MouseEvent<HTMLButtonElement>) {
        const btnElement = e.target as HTMLButtonElement;
        setChosenCountry(btnElement.innerText);
        setInputClick(false);
    }

    return (
        <div className={style.container}>
            <div className={style.customInput} onClick={handleInputClick}>
                <p>{chosenCountry}</p>
                <AiFillCaretUp
                    className={
                        inputClick
                            ? `${style.arrowIcon} ${style.iconSpin}`
                            : `${style.arrowIcon} `
                    }
                />
            </div>
            {inputClick && (
                <div className={style.dropdown}>
                    {countries.map((country) => {
                        return (
                            <button
                                key={country}
                                className={style.countryChoice}
                                onClick={handleChosenCountry}
                            >
                                {country}
                            </button>
                        );
                    })}
                </div>
            )}
            {inputClick && (
                <div
                    className={style.closer}
                    onClick={() => {
                        setInputClick(false);
                    }}
                ></div>
            )}

            <div className={style.toggleBtns}>
                <button
                    className={countriesToggled ? `${style.toggled}` : ""}
                    onClick={() => {
                        setCountriesToggled(true);
                    }}
                >
                    Countries
                </button>
                <button
                    className={!countriesToggled ? `${style.toggled}` : ""}
                    onClick={() => {
                        setCountriesToggled(false);
                    }}
                >
                    Capitals
                </button>
            </div>
            <Link href="/play">
                <button className={style.readyBtn}>Ready</button>
            </Link>
        </div>
    );
}

export default SmallMenu;
