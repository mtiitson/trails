import axios from 'axios';

export function saveTracks(tracks) {
    return axios.post('./', tracks)
}

export function getTracks() {
    return axios.get('./tracks')
}