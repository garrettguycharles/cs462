import {MapReduceGrouper} from "@shared/MapReduceGrouper";
import {MapReduceMaster} from "@shared/MapReduceMaster";
import axios, {AxiosResponse} from "axios";
import {request} from "http";
import {sleep} from "@shared/functions";

export class MapReduceMapper {

    groupers: MapReduceGrouper[] = [];
    finished = false;
    id: string;

    constructor(id: string, groupers: MapReduceGrouper[]) {
        this.id = id;
        this.groupers = groupers;
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async getWordCounts(url: string,
                               words_to_find: string[], context: MapReduceMaster): Promise<void> {

        // console.log(url);

        await sleep(0);

        const start = new Date().getTime();
        const res = await axios.get(url);

        // console.log(res);

        const split_text = (res.data.split(" ") || []);
        for (let i = 0; i < split_text.length; i++) {
            split_text[i] = split_text[i].toUpperCase().trim();
        }

        const upper_words = [];
        for (const word of words_to_find) {
            upper_words.push(word.toUpperCase().trim());
        }

        // try different strategies for giving words to groupers

        let grouper_index = 0;

        for (let i = 0; i < split_text.length; i++) {
            const word: string = split_text[i];

            for (const dictword of upper_words) {
                if (word.indexOf(dictword) > -1) {
                    console.log(`Mapper ${this.id} found ${dictword}`);
                    this.groupers[grouper_index].offer(dictword);
                    grouper_index = (grouper_index + 1) % this.groupers.length;
                    // await sleep(400 * dictword.length);
                }
            }

            // await sleep(120);
            await sleep(0);
        }

        const end = new Date().getTime();

        this.finished = true;
        context.reportMapperFinished(this.id);
        console.log(`Mapper ${this.id} finished in: ${(end - start) / 1000} seconds`);
    }
}