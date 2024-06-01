#!/usr/bin/env python3

import rospy
from nav_msgs.msg import Odometry

class OdometrySaver:
    def __init__(self):
        self.odom_sub = rospy.Subscriber('/odom', Odometry, self.odom_callback)
        self.odom_data = None
        self.file_path = 'odometry_data.txt'

    def odom_callback(self, msg):
        self.odom_data = msg

    def save_odometry_to_file(self):
        if self.odom_data is not None:
            with open(self.file_path, 'a') as f:
                f.write("x: {}, y: {}\n".format(self.odom_data.pose.pose.position.x, self.odom_data.pose.pose.position.y))
            rospy.loginfo("Odometry data (x, y) saved to file: {}".format(self.file_path))
        else:
            rospy.logwarn("No odometry data available to save.")

def main():
    rospy.init_node('odometry_saver')

    odometry_saver = OdometrySaver()

    rospy.loginfo("Press Enter to save odometry data (x, y). Press Ctrl+C to exit.")

    while not rospy.is_shutdown():
        user_input = input()  # Python 3
        if user_input == "":
            odometry_saver.save_odometry_to_file()

if __name__ == '__main__':
    main()