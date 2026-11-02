import type {PublicTrainingData} from './public-data';
export type ViewerRow={userId:string;studentId:string|null;email:string;displayName:string;firstSeen:string;lastSeen:string;visits:number};
export type ViewerState={member:{name:string;className:string}|null;choices:{id:string;name:string;className:string}[];data:PublicTrainingData|null};
export type ViewerSummary=ViewerRow&{studentName:string;className:string};
