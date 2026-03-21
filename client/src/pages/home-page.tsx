import React from 'react';
import './home-page.css';
import { HeaderImage } from '../components/header/header-image';
import { TopMenu } from '../components/header/top-menu';

export default function HomePage() {
    return (
        <div>
            <HeaderImage pageId="home"  enableMask={true} />
            <TopMenu />
            <div className="home-page">
                <h1>The Awful Green Things from Outer Space</h1>

                <img className='home-page-right-image' src="box.jpg" />
                <p><strong>The Awful Green Things from Outer Space</strong> is a classic science fiction board game designed by Tom Wham and first published in 1979 by Steve Jackson Games. Known for its humorous theme and unpredictable gameplay, the game places two players in a tense and often chaotic struggle aboard a spaceship overrun by rapidly multiplying alien creatures. One player controls the human crew of the starship <em>Znutar</em>, while the other commands the mysterious and ever-growing Awful Green Things. The game blends strategy, experimentation, and dark humor as the crew attempts to survive and eliminate the alien threat before it spreads out of control.</p>


                <h2>Game Setup and Initial Discovery</h2>
                <p>The game begins aboard the interstellar freighter <em>Znutar</em>, represented by a detailed map of the ship’s interior. Various crew members are scattered throughout different compartments, performing their normal duties when a strange alien life form is discovered in the ship’s laboratory. This discovery quickly escalates into a full-scale crisis as the alien organisms begin multiplying and spreading through the ship.</p>
                <p>Each player takes control of one side of the conflict. The crew player commands the ship’s officers, engineers, scientists, and security personnel, each with different movement and combat capabilities. The opposing player controls the Awful Green Things, which begin as small organisms but quickly grow and reproduce, becoming increasingly dangerous as the game progresses.</p>

                <h2>Movement and Ship Layout</h2>
                <p>The interior of the <em>Znutar</em> is divided into interconnected rooms such as the bridge, engine room, cargo hold, and laboratories. Crew members move through corridors and compartments attempting to contain the spreading alien menace. The aliens also move from room to room, spreading rapidly as they multiply.</p>
                <p>Some areas of the ship contain escape pods, weapon storage, or vital systems. These locations often become key strategic points as the crew attempts to gather equipment, protect critical ship functions, or prepare for evacuation.</p>

                <h2>Experimental Weapons and Combat</h2>
                <p>One of the most distinctive mechanics in <strong>The Awful Green Things from Outer Space</strong> is the experimental weapons system. The crew has access to a variety of strange devices—such as fire extinguishers, rocket fuel, electrical cables, and canisters of mysterious chemicals—but at the start of the game, no one knows exactly how effective these tools are against the aliens.</p>
                <p>When a weapon is used for the first time, its effectiveness is determined randomly and recorded for the remainder of the game. Some weapons may prove devastating to the aliens, while others might be nearly useless—or even cause unexpected side effects. This mechanic creates a sense of experimentation and tension, as the crew desperately tests equipment while under attack.</p>


                <h2>Alien Growth and Multiplication</h2>
                <p>The Awful Green Things have their own unique lifecycle. They begin as small “Eggs” or “Baby” forms and gradually grow into larger, more powerful stages. As they mature, they gain increased movement and combat strength, allowing them to overwhelm crew members and spread more rapidly throughout the ship.</p>
                <p>The aliens also multiply when certain conditions are met, often causing sudden population explosions that can dramatically shift the balance of the game. This constant growth forces the crew player to act quickly and aggressively before the infestation becomes impossible to contain.</p>

                <img className='home-page-left-image' src="action.jpg" />
                <h2>Escapes, Ship Destruction, and Survival</h2>
                <p>As the situation aboard the <em>Znutar</em> becomes more desperate, crew members may attempt to escape using the ship’s lifeboats or emergency craft. However, escaping safely is not always easy, and there is always the terrifying possibility that the aliens may board the escape vehicles as well.</p>
                <p>The crew also has the option of attempting to destroy the entire ship in order to eliminate the infestation. This drastic measure can potentially save humanity—but only if the crew manages to escape before the vessel is destroyed.</p>

                <h2>Winning the Game</h2>
                <p>The crew player wins by successfully eliminating all of the Awful Green Things or by escaping safely while ensuring that no aliens survive to reach civilization. The alien player wins if the creatures eliminate the crew or escape the ship themselves, potentially spreading the infestation across the galaxy.</p>
                <p>Because of the game’s unpredictable weapon effects, rapidly multiplying aliens, and desperate escape attempts, the outcome is often uncertain until the final moments.</p>

                <h2>Legacy and Appeal</h2>
                <p><strong>The Awful Green Things from Outer Space</strong> remains one of the most beloved humorous science fiction board games ever created. Its blend of suspense, strategy, and unpredictable experimentation makes every playthrough unique. The game captures the spirit of classic science fiction horror films, where a small group of humans must struggle against an unstoppable alien menace in the confined corridors of a spaceship.</p>
                <p>Decades after its original release, the game continues to be enjoyed by fans of science fiction, board games, and lighthearted tactical gameplay.</p>

            </div>
        </div>
    )
}