export interface LearningUser {
  id: number;
  username: string;
  email: string;
}

export interface LearningCourse {
  id: number;
  short_name: string;
  full_name: string;
  summary: string;
  category: string;
  start_at?: number;
  end_at?: number;
  visible: boolean;
}

export interface EnrolledCourse {
  id: number;
  short_name: string;
  full_name: string;
  enrolled_at?: number | null;
  last_access?: number | null;
  progress?: number;
  completed: boolean;
}

export interface CourseCompletion {
  course_id: number;
  completed: boolean;
  status: string;
}

export interface GradeItem {
  id: number;
  item_name: string;
  grade?: number;
  grade_min: number;
  grade_max: number;
  grade_formatted: string;
  feedback: string;
  hidden: boolean;
}
